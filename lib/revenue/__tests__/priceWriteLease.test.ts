const mockExecutionFindOne = jest.fn();
const mockExecutionFindOneAndUpdate = jest.fn();
const mockExecutionFindById = jest.fn();
const mockOverrideFindOneAndUpdate = jest.fn();
const mockResolveEffectivePrice = jest.fn();
const mockSellability = jest.fn();
const mockWithTransaction = jest.fn(async (work: () => Promise<void>) => work());
const mockEndSession = jest.fn();
const mockSession = { withTransaction: mockWithTransaction, endSession: mockEndSession };

jest.mock('mongoose', () => ({
  __esModule: true,
  default: { startSession: jest.fn(async () => mockSession) },
}));
jest.mock('@/lib/models/RevenuePriceExecution', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockExecutionFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockExecutionFindOneAndUpdate(...args),
    findById: (...args: unknown[]) => mockExecutionFindById(...args),
  },
}));
jest.mock('@/lib/models/RevenuePriceOverride', () => ({
  __esModule: true,
  default: { findOneAndUpdate: (...args: unknown[]) => mockOverrideFindOneAndUpdate(...args) },
}));
jest.mock('@/lib/revenue/pricingResolver', () => ({
  normalizePriceDate: (value: string) => new Date(`${value}T00:00:00.000Z`),
  resolveEffectivePrice: (...args: unknown[]) => mockResolveEffectivePrice(...args),
}));
jest.mock('@/lib/revenue/sellableDeparture', () => ({
  assertRevenuePriceTargetSellable: (...args: unknown[]) => mockSellability(...args),
}));
jest.mock('@/lib/revenue/priceWriteGate', () => ({
  assertRevenuePilotTourAllowed: jest.fn(),
  RevenuePricingWriteError: class RevenuePricingWriteError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
  },
}));
jest.mock('@/lib/revenue/commissioningGate', () => ({
  assertRevenuePilotCommissioningAllowed: jest.fn(),
  commissioningMovementIsSafe: jest.fn(() => true),
}));

import { applyPriceWrite, hashRevenuePayload } from '@/lib/revenue/priceWrite';

const body = '{}';
const priceWrite = {
  executionId: 'exec_12345678',
  recommendationId: 'rec_12345678',
  tenantId: 'mountain-tours',
  target: { tourId: '507f1f77bcf86cd799439011', optionKey: 'standard', date: '2026-09-20', time: '10:00' },
  prices: { adult: 104, child: 52, infant: 0 },
  currency: 'USD',
  expectedVersion: 0,
  policyHash: 'policy-hash',
  policySnapshot: { floor: 80, ceiling: 130, maxChangePercent: 5, minConfidence: 85, cooldownHours: 24, mode: 'assist' as const },
  sourceVersion: 'source-v1',
  confidence: 90,
  actor: 'revenue-owner',
  mode: 'assist' as const,
};

const catalogueQuote = {
  prices: { adult: 100, child: 50, infant: 0 },
  cataloguePrices: { adult: 100, child: 50, infant: 0 },
  version: 0,
  executionId: null,
  sourceVersion: 'source-v1',
};

type ReceiptState = {
  _id: string;
  idempotencyKey: string;
  requestHash: string;
  state: string;
  applyClaimToken?: string;
  applyClaimExpiresAt?: Date;
  blockReason?: string;
};

function installPendingReceipt() {
  const receipt: ReceiptState = {
    _id: 'receipt-1',
    idempotencyKey: 'idem-1',
    requestHash: hashRevenuePayload(body),
    state: 'pending',
    applyClaimToken: 'expired-token',
    applyClaimExpiresAt: new Date(0),
  };
  const intent = { _id: receipt._id, toObject: () => ({ ...receipt }) };
  mockExecutionFindOne.mockReturnValue({ lean: jest.fn(async () => ({ ...receipt })) });
  mockExecutionFindById.mockReturnValue({ lean: jest.fn(async () => ({ ...receipt })) });
  mockExecutionFindOneAndUpdate.mockImplementation((filter, update, options) => {
    if (filter.$or) {
      receipt.applyClaimToken = update.$set.applyClaimToken;
      receipt.applyClaimExpiresAt = update.$set.applyClaimExpiresAt;
      return Promise.resolve(intent);
    }
    if (options?.session) {
      const ownsLiveLease = receipt.state === 'pending'
        && receipt.applyClaimToken === filter.applyClaimToken
        && Boolean(receipt.applyClaimExpiresAt && receipt.applyClaimExpiresAt > filter.applyClaimExpiresAt.$gt);
      if (ownsLiveLease) {
        receipt.state = 'applied';
        delete receipt.applyClaimToken;
        delete receipt.applyClaimExpiresAt;
      }
      return { lean: jest.fn(async () => ownsLiveLease ? ({ ...receipt }) : null) };
    }
    if (filter.applyClaimToken) {
      const ownsLiveLease = receipt.state === 'pending'
        && receipt.applyClaimToken === filter.applyClaimToken
        && Boolean(receipt.applyClaimExpiresAt && receipt.applyClaimExpiresAt > filter.applyClaimExpiresAt.$gt);
      if (ownsLiveLease) {
        receipt.state = update.$set.state;
        receipt.blockReason = update.$set.blockReason;
        delete receipt.applyClaimToken;
        delete receipt.applyClaimExpiresAt;
      }
      return { lean: jest.fn(async () => ownsLiveLease ? ({ ...receipt }) : null) };
    }
    return { lean: jest.fn(async () => null) };
  });
  return receipt;
}

describe('RevenuePilot apply lease fencing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REVENUEPILOT_MAX_WRITE_PERCENT = '5';
    mockResolveEffectivePrice.mockResolvedValue(catalogueQuote);
    mockSellability.mockResolvedValue({ startsAtUtc: '2026-09-20T08:00:00.000Z', capacity: 10, booked: 0, available: 10, optionId: 'standard' });
    mockOverrideFindOneAndUpdate.mockResolvedValue({ _id: 'override-1' });
  });

  it('prevents expired worker A from writing after worker B blocks the receipt', async () => {
    const receipt = installPendingReceipt();
    let releaseSellability!: (value: Record<string, unknown>) => void;
    let reachedSellability!: () => void;
    const reached = new Promise<void>((resolve) => { reachedSellability = resolve; });
    mockSellability.mockImplementationOnce(() => {
      reachedSellability();
      return new Promise((resolve) => { releaseSellability = resolve; });
    });

    const workerA = applyPriceWrite(priceWrite, 'idem-1', body);
    await reached;
    receipt.applyClaimExpiresAt = new Date(0);
    const { RevenuePricingWriteError } = jest.requireMock('@/lib/revenue/priceWriteGate') as {
      RevenuePricingWriteError: new (status: number, code: string, message: string) => Error;
    };
    mockSellability.mockRejectedValueOnce(new RevenuePricingWriteError(
      422,
      'OPTION_STOP_SALE',
      'A newer worker observed an option stop-sale.',
    ));
    await expect(applyPriceWrite(priceWrite, 'idem-1', body)).resolves.toMatchObject({
      state: 'blocked',
      reason: 'A newer worker observed an option stop-sale.',
      code: 'OPTION_STOP_SALE',
    });
    releaseSellability({ startsAtUtc: '2026-09-20T08:00:00.000Z', capacity: 10, booked: 0, available: 10, optionId: 'standard' });

    await expect(workerA).resolves.toMatchObject({
      state: 'blocked',
      replayed: true,
      reason: 'A newer worker observed an option stop-sale.',
    });
    expect(mockOverrideFindOneAndUpdate).not.toHaveBeenCalled();
    expect(receipt.state).toBe('blocked');
  });

  it('commits the fenced receipt and override in the same transaction when the lease is current', async () => {
    installPendingReceipt();
    mockResolveEffectivePrice
      .mockResolvedValueOnce(catalogueQuote)
      .mockResolvedValueOnce({ ...catalogueQuote, prices: priceWrite.prices, version: 1, executionId: priceWrite.executionId });

    await expect(applyPriceWrite(priceWrite, 'idem-1', body)).resolves.toMatchObject({ state: 'applied' });
    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockOverrideFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'mountain-tours', version: 0 }),
      expect.any(Object),
      expect.objectContaining({ session: mockSession, upsert: true, runValidators: true }),
    );
    expect(mockEndSession).toHaveBeenCalledTimes(1);
  });
});
