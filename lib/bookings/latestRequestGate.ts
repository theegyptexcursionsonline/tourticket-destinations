export type LatestRequestGate = {
  issue: () => number;
  isCurrent: (token: number) => boolean;
  cancel: () => void;
};

/**
 * Monotonic gate for request-driven UI state. Only the most recently issued
 * request may commit a response; changing its inputs cancels all in-flight
 * tokens without needing the transport itself to support aborts.
 */
export function createLatestRequestGate(): LatestRequestGate {
  let generation = 0;
  return {
    issue: () => ++generation,
    isCurrent: (token) => token === generation,
    cancel: () => { generation += 1; },
  };
}
