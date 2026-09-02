import { createLatestRequestGate } from '@/lib/bookings/latestRequestGate';

describe('latest async request gate', () => {
  it('lets only the newest overlapping request commit', () => {
    const gate = createLatestRequestGate();
    const first = gate.issue();
    const second = gate.issue();
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });

  it('invalidates an in-flight request when its inputs change', () => {
    const gate = createLatestRequestGate();
    const request = gate.issue();
    gate.cancel();
    expect(gate.isCurrent(request)).toBe(false);
  });
});
