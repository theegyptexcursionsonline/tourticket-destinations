import { createHash, createHmac, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import Tour from '../lib/models/Tour';
import StopSale from '../lib/models/StopSale';
import RevenueMachineNonce from '../lib/models/RevenueMachineNonce';
import { hashRevenuePolicy } from '../lib/revenue/priceWriteValidation';
import { pricingCatalogueVersion } from '../lib/revenue/pricingVersion';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const primarySecret = 'primary-local-e2e-secret-0123456789abcdef';
const secondarySecret = 'secondary-local-e2e-secret-0123456789abcdef';
const tenantId = 'revenuepilot-e2e';

function futureDate(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function signedRequest(method: string, path: string, body = '', keyId = 'primary', nonce = randomUUID(), extraHeaders: Record<string, string> = {}) {
  const tenantPath = `${path}${path.includes('?') ? '&' : '?'}tenantId=${encodeURIComponent(tenantId)}`;
  const timestamp = String(Date.now());
  const secret = keyId === 'primary' ? primarySecret : secondarySecret;
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const signature = createHmac('sha256', secret).update([timestamp, nonce, method, tenantPath, bodyHash].join('\n')).digest('hex');
  return new NextRequest(`http://localhost${tenantPath}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-rp-key-id': keyId, 'x-rp-timestamp': timestamp, 'x-rp-nonce': nonce, 'x-rp-signature': signature, ...extraHeaders },
    body: method === 'GET' ? undefined : body,
  });
}

async function json(response: Response) {
  return { status: response.status, body: await response.json() as Record<string, any> };
}

async function run() {
  const uri = process.env.MONGODB_URI || '';
  const parsed = new URL(uri);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || !parsed.pathname.endsWith('revenuepilot_e2e_test')) throw new Error('E2E requires a local revenuepilot_e2e_test database.');
  process.env.REVENUEPILOT_HMAC_KEYS = `primary:${primarySecret},secondary:${secondarySecret}`;
  process.env.REVENUEPILOT_HMAC_SCOPES = 'primary=read|write,secondary=read|write';
  process.env.REVENUEPILOT_HMAC_TENANTS = `primary=${tenantId},secondary=${tenantId}`;
  process.env.DEFAULT_TENANT_ID = tenantId;
  process.env.REVENUEPILOT_PRICING_API_ENABLED = 'true';
  process.env.REVENUEPILOT_MAX_WRITE_PERCENT = '5';
  process.env.REVENUEPILOT_SKIP_CACHE_REVALIDATION = 'true';
  process.env.REVENUEPILOT_SKIP_SEARCH_SYNC = 'true';
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await mongoose.connection.collection('tenants').insertOne({
    tenantId,
    name: 'RevenuePilot E2E',
    slug: tenantId,
    domain: 'revenuepilot-e2e.localhost',
    isActive: true,
    payments: { currency: 'USD', currencySymbol: '$', supportedPaymentMethods: ['card'] },
  });
  await RevenueMachineNonce.syncIndexes();
  const objectId = () => new mongoose.Types.ObjectId();
  const tour = await Tour.create({
    tenantId,
    tenantIds: [tenantId],
    title: 'Revenue Execution E2E Tour',
    slug: 'revenue-execution-e2e-tour',
    destination: objectId(),
    category: [objectId()],
    description: 'A sufficiently detailed controlled pricing end-to-end test tour.',
    discountPrice: 100,
    revenueGuestPrices: { adult: 100, child: 50, infant: 0 },
    duration: '4 hours',
    image: 'https://example.invalid/tour.jpg',
    bookingOptions: [{ pricingKey: 'premium-local', type: 'private', label: 'Premium option', price: 120, guestPrices: { adult: 120, child: 60, infant: 0 } }],
    availability: { type: 'daily', availableDays: [0, 1, 2, 3, 4, 5, 6], slots: [{ time: '10:00', capacity: 10 }] },
    // Publish with updateOne below so this isolated route test does not invoke
    // the unrelated Algolia post-save hook without its full model registry.
    isPublished: false,
  });
  await Tour.updateOne({ _id: tour._id }, { $set: { isPublished: true } });
  process.env.REVENUEPILOT_ALLOWED_TOUR_IDS = String(tour._id);
  const sourceVersion = pricingCatalogueVersion(tour.toObject());
  const departureDate = futureDate(60);
  const stoppedDate = futureDate(61);
  const policySnapshot = { floor: 80, ceiling: 130, maxChangePercent: 5, minConfidence: 85, cooldownHours: 24, mode: 'assist' as const };
  const payload = {
    executionId: 'exec_local_e2e', recommendationId: 'rec_local_e2e', tenantId,
    target: { tourId: String(tour._id), optionKey: 'standard', date: departureDate, time: '10:00' },
    prices: { adult: 104, child: 52, infant: 0 }, currency: 'USD', expectedVersion: 0,
    policyHash: hashRevenuePolicy(policySnapshot), policySnapshot, sourceVersion, confidence: 90, actor: 'owner@example.test', mode: 'assist',
  };
  const body = JSON.stringify(payload);
  const [{ POST: apply }, { GET: readExecution }, { POST: rollback }, { GET: quote }] = await Promise.all([
    import('../app/api/v1/revenue/prices/apply/route'),
    import('../app/api/v1/revenue/prices/[executionId]/route'),
    import('../app/api/v1/revenue/prices/[executionId]/rollback/route'),
    import('../app/api/tours/[tourId]/quote/route'),
  ]);

  const applyPath = '/api/v1/revenue/prices/apply';
  const applied = await json(await apply(signedRequest('POST', applyPath, body, 'secondary', randomUUID(), { 'idempotency-key': 'idem-local-e2e' })));
  assert(applied.status === 201 && applied.body.state === 'applied', `Secondary rotation key could not apply a valid price: ${JSON.stringify(applied)}`);

  const changedBody = JSON.stringify({ ...payload, actor: 'different-owner@example.test' });
  const idempotencyMismatch = await json(await apply(signedRequest('POST', applyPath, changedBody, 'primary', randomUUID(), { 'idempotency-key': 'idem-local-e2e' })));
  assert(idempotencyMismatch.status === 409 && (idempotencyMismatch.body.error as any)?.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH', 'Idempotency key was not bound to the original body hash.');

  const replayNonce = randomUUID();
  const replayRequest = signedRequest('POST', applyPath, body, 'primary', replayNonce, { 'idempotency-key': 'idem-local-e2e' });
  const replayed = await json(await apply(replayRequest));
  assert(replayed.status === 200 && replayed.body.state === 'replayed' && replayed.body.outcome === 'applied', 'Idempotent apply did not replay the successful outcome safely.');
  const nonceReplay = await json(await apply(signedRequest('POST', applyPath, body, 'primary', replayNonce, { 'idempotency-key': 'idem-local-e2e' })));
  assert(nonceReplay.status === 409 && (nonceReplay.body.error as any)?.code === 'MACHINE_REPLAY', 'Reused machine nonce was not rejected.');

  const executionPath = '/api/v1/revenue/prices/exec_local_e2e';
  const verified = await json(await readExecution(signedRequest('GET', executionPath), { params: Promise.resolve({ executionId: 'exec_local_e2e' }) }));
  assert(verified.status === 200 && verified.body.verified === true && (verified.body.effective as any)?.prices?.adult === 104, 'Read-back did not verify the applied public price.');

  const quotePath = `/api/tours/${tour._id}/quote?date=${departureDate}&time=10%3A00&optionKey=standard`;
  const publicQuote = await json(await quote(new NextRequest(`http://localhost${quotePath}`, { headers: { 'x-tenant-id': tenantId } }), { params: Promise.resolve({ tourId: String(tour._id) }) }));
  assert(publicQuote.status === 200 && (publicQuote.body.quote as any)?.version === 1 && (publicQuote.body.quote as any)?.prices?.adult === 104, 'Public quote did not use the applied override.');

  const stopDate = new Date(`${stoppedDate}T00:00:00.000Z`);
  const premiumOptionId = String(tour.bookingOptions?.[0]?.id || '');
  assert(Boolean(premiumOptionId), 'The E2E tour did not persist a storefront option ID.');
  await StopSale.create({ tenantId, tourId: tour._id, startDate: stopDate, endDate: stopDate, optionIds: [premiumOptionId], reason: 'Local E2E option stop sale' });
  const stoppedPayload = {
    ...payload,
    executionId: 'exec_option_stopped',
    recommendationId: 'rec_option_stopped',
    target: { tourId: String(tour._id), optionKey: 'premium-local', date: stoppedDate, time: '10:00' },
    prices: { adult: 124, child: 62, infant: 0 },
  };
  const stoppedBody = JSON.stringify(stoppedPayload);
  const optionStopped = await json(await apply(signedRequest('POST', applyPath, stoppedBody, 'primary', randomUUID(), { 'idempotency-key': 'idem-option-stopped' })));
  assert(optionStopped.status === 422 && optionStopped.body.state === 'blocked' && optionStopped.body.code === 'OPTION_STOP_SALE', 'Option-level stop sale did not block execution.');
  const optionStoppedReplay = await json(await apply(signedRequest('POST', applyPath, stoppedBody, 'primary', randomUUID(), { 'idempotency-key': 'idem-option-stopped' })));
  assert(optionStoppedReplay.status === 422 && optionStoppedReplay.body.state === 'blocked' && optionStoppedReplay.body.replayed === true, 'Blocked terminal outcome was not preserved on retry.');

  const disallowedPayload = JSON.stringify({ ...payload, executionId: 'exec_disallowed', recommendationId: 'rec_disallowed', target: { ...payload.target, tourId: String(objectId()) } });
  const disallowed = await json(await apply(signedRequest('POST', applyPath, disallowedPayload, 'primary', randomUUID(), { 'idempotency-key': 'idem-disallowed' })));
  assert(disallowed.status === 403 && (disallowed.body.error as any)?.code === 'TOUR_NOT_APPROVED', 'Unapproved tour write was not rejected.');

  const rollbackPath = '/api/v1/revenue/prices/exec_local_e2e/rollback';
  const rollbackBody = '{}';
  const rollbackRequest = () => rollback(signedRequest('POST', rollbackPath, rollbackBody, 'primary', randomUUID(), { 'idempotency-key': 'idem-local-e2e:rollback' }), { params: Promise.resolve({ executionId: 'exec_local_e2e' }) });
  const concurrentRollbacks = await Promise.all([rollbackRequest().then(json), rollbackRequest().then(json)]);
  assert(concurrentRollbacks.every((result) => [200, 202].includes(result.status) && result.body.state !== 'rollback_failed'), `Concurrent rollback produced an unsafe outcome: ${JSON.stringify(concurrentRollbacks)}`);
  const rolledBack = await json(await rollbackRequest());
  assert(rolledBack.status === 200 && rolledBack.body.state === 'rollback_applied' && (rolledBack.body.effectivePrices as any)?.adult === 100, 'Rollback did not converge on the restored previous prices.');

  const rollbackMismatch = await json(await rollback(signedRequest('POST', rollbackPath, '{"reason":"different"}', 'primary', randomUUID(), { 'idempotency-key': 'idem-local-e2e:rollback' }), { params: Promise.resolve({ executionId: 'exec_local_e2e' }) }));
  assert(rollbackMismatch.status === 409 && (rollbackMismatch.body.error as any)?.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH', 'Rollback idempotency key was not bound to the original body.');

  const restoredQuote = await json(await quote(new NextRequest(`http://localhost${quotePath}`, { headers: { 'x-tenant-id': tenantId } }), { params: Promise.resolve({ tourId: String(tour._id) }) }));
  assert((restoredQuote.body.quote as any)?.version === 2 && (restoredQuote.body.quote as any)?.prices?.adult === 100, 'Public quote did not reflect rollback restoration.');

  const stalePayload = JSON.stringify({ ...payload, executionId: 'exec_stale', recommendationId: 'rec_stale' });
  const conflict = await json(await apply(signedRequest('POST', applyPath, stalePayload, 'primary', randomUUID(), { 'idempotency-key': 'idem-stale' })));
  assert(conflict.status === 409 && conflict.body.state === 'conflict', 'Stale expected version was not rejected.');
  const conflictReplay = await json(await apply(signedRequest('POST', applyPath, stalePayload, 'primary', randomUUID(), { 'idempotency-key': 'idem-stale' })));
  assert(conflictReplay.status === 409 && conflictReplay.body.state === 'conflict' && conflictReplay.body.replayed === true, 'Conflict terminal outcome was not preserved on retry.');

  const tamperedPayload = JSON.stringify({ ...payload, executionId: 'exec_tampered', recommendationId: 'rec_tampered', policySnapshot: { ...policySnapshot, ceiling: 200 } });
  const blocked = await json(await apply(signedRequest('POST', applyPath, tamperedPayload, 'primary', randomUUID(), { 'idempotency-key': 'idem-tampered' })));
  assert(blocked.status === 400 && (blocked.body.error as any)?.code === 'PRICE_APPLY_FAILED', 'Tampered policy hash was not rejected.');

  console.log(JSON.stringify({
    isolatedDatabase: parsed.pathname.slice(1),
    tourId: String(tour._id),
    rotation: ['primary', 'secondary'],
    applied: applied.body.state,
    idempotency: replayed.body.state,
    idempotencyMismatch: (idempotencyMismatch.body.error as any)?.code,
    nonceReplay: (nonceReplay.body.error as any)?.code,
    optionStopSale: optionStopped.body.state,
    allowlist: (disallowed.body.error as any)?.code,
    readback: verified.body.verified,
    publicQuoteVersion: (publicQuote.body.quote as any)?.version,
    rollback: rolledBack.body.state,
    concurrentRollbackStatuses: concurrentRollbacks.map((result) => result.status),
    restoredQuoteVersion: (restoredQuote.body.quote as any)?.version,
    staleWrite: conflict.body.state,
    tamperedPolicy: (blocked.body.error as any)?.code,
  }));
  await mongoose.disconnect();
}

run().catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
