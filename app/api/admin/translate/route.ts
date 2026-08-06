/**
 * Backward-compatible alias for the safe per-locale translation endpoint.
 *
 * The former implementation invoked the bulk autoTranslate* helpers and
 * replaced every locale bucket without an owner-visible commit boundary.
 * Keeping one handler means both URLs now require an explicit locale and share
 * the same model-specific RBAC, tenant scoping, manual-value preservation, and
 * compare-and-set concurrency guard.
 */
export { POST } from './stream/route';
