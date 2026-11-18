/** @jest-environment node */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { evaluateAudit, chainOf } = require('../../scripts/audit-prod.cjs');

/**
 * Release gate production audit. A high advisory with no patched release
 * (picomatch, GHSA-fc5q-39xc-vjpf) is accepted only on the Sentry build-time path,
 * until 17 Dec 2026, and only while no patched version exists.
 */
const SENTRY = '.>@sentry/nextjs>@rollup/plugin-commonjs>picomatch';
const picomatch = (paths: string[], extra: Record<string, unknown> = {}) => ({
  advisories: {
    1: {
      module_name: 'picomatch',
      github_advisory_id: 'GHSA-fc5q-39xc-vjpf',
      severity: 'high',
      patched_versions: '<0.0.0',
      title: 'ReDoS',
      findings: paths.map((path) => ({ paths: [path] })),
      ...extra,
    },
  },
});
const TODAY = new Date('2026-11-18T12:00:00Z');

test('the recorded acceptance passes on its own path, before it expires', () => {
  const { failures, accepted } = evaluateAudit(picomatch([SENTRY]), { today: TODAY });
  expect(failures).toEqual([]);
  expect(accepted).toHaveLength(1);
});

test('the same advisory reached through another package fails', () => {
  const { failures } = evaluateAudit(picomatch([SENTRY, '.>next-intl>@parcel/watcher>picomatch']), { today: TODAY });
  expect(failures[0]).toMatch(/outside its accepted path \(next-intl > @parcel\/watcher\)/);
});

test('an unknown path fails rather than being assumed safe', () => {
  expect(evaluateAudit(picomatch([]), { today: TODAY }).failures).toHaveLength(1);
});

test('the acceptance stops counting after it expires', () => {
  expect(evaluateAudit(picomatch([SENTRY]), { today: new Date('2026-12-18T00:00:00Z') }).failures[0]).toMatch(/expired/);
});

test('once a patched version exists, the fix is required', () => {
  expect(evaluateAudit(picomatch([SENTRY], { patched_versions: '>=4.0.8' }), { today: TODAY }).failures[0]).toMatch(/patched version/);
});

test('any other high or critical advisory fails; moderate is left to the audit level', () => {
  const report = {
    advisories: {
      1: { module_name: 'qs', github_advisory_id: 'GHSA-aaaa-bbbb-cccc', severity: 'high', findings: [{ paths: ['.>express>qs'] }] },
      2: { module_name: 'x', github_advisory_id: 'GHSA-xxxx-yyyy-zzzz', severity: 'critical', findings: [] },
      3: { module_name: 'next', github_advisory_id: 'GHSA-mfr8-8qww-v76h', severity: 'moderate', findings: [] },
    },
  };
  expect(evaluateAudit(report, { today: TODAY }).failures).toHaveLength(2);
});

test('fails closed when the audit output cannot be read', () => {
  expect(evaluateAudit(null).failures[0]).toMatch(/failing closed/);
  expect(evaluateAudit({ error: 'registry down' }).failures[0]).toMatch(/failing closed/);
});

test('reads pnpm dependency paths', () => {
  expect(chainOf(SENTRY, 'picomatch')).toEqual(['@sentry/nextjs', '@rollup/plugin-commonjs']);
});
