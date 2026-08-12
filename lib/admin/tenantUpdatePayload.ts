const BLOCKED_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

function safeSegments(path: string): string[] {
  const segments = path.split('.').filter(Boolean);
  if (
    segments.length === 0
    || segments.some((segment) => BLOCKED_PATH_SEGMENTS.has(segment))
  ) {
    throw new Error(`Invalid tenant update path: ${path}`);
  }
  return segments;
}

/**
 * Build the smallest tenant update accepted by the partial PUT route.
 *
 * The editor hydrates missing legacy fields with display defaults. Sending the
 * whole hydrated document can therefore overwrite data the admin never
 * touched, and can trigger validation for unrelated legacy gaps. The API
 * replaces top-level nested objects, so an edited path includes its complete
 * top-level section while every untouched section remains absent.
 */
export function buildTenantUpdatePayload(
  tenant: Record<string, unknown>,
  dirtyPaths: Iterable<string>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const path of dirtyPaths) {
    const segments = safeSegments(path);
    const topLevelField = segments[0];
    payload[topLevelField] = tenant[topLevelField];
  }

  return payload;
}
