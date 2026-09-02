# RevenuePilot pricing interface

TourTicket remains the pricing authority. RevenuePilot may call the versioned `/api/v1/revenue/*` machine endpoints only with a dedicated HMAC identity. Customer quotes resolve through `/api/tours/{tourId}/quote`; checkout rejects a stale `priceVersion` with `409 PRICE_CHANGED`.

Required deployment settings:

- `REVENUEPILOT_HMAC_KEYS`: comma-separated `keyId:secret` pairs. Secrets must be at least 32 characters and stored only in Netlify/Railway secret stores.
- `REVENUEPILOT_HMAC_SCOPES`: comma-separated `keyId=read|write` grants. A rotation key can be added before removing the old key.
- `REVENUEPILOT_HMAC_TENANTS`: comma-separated `keyId=tenant-one|tenant-two` bindings. Every configured key must have at least one explicit Mountain Tour network tenant; missing bindings fail closed.
- `REVENUEPILOT_PRICING_API_ENABLED=false`: global write kill switch. Keep false through migration and shadow qualification.
- `REVENUEPILOT_MAX_WRITE_PERCENT=5`: TourTicket-side defense-in-depth movement cap.
- `REVENUEPILOT_ALLOWED_TOUR_IDS`: keep empty in the closed posture; use one exact Mongo ObjectId only for an approved canary. Wildcards and malformed IDs fail closed.
- `CRON_SECRET`: authenticates the five-minute `revenue-maintenance` scheduled function and `/api/cron/pricing-summaries` recovery route.

Run `pnpm revenue:backfill-pricing -- --tenant-id <tenant>` first to inspect the migration plan. It is dry-run by default. Only an approved production change may add `--apply`; the migration assigns immutable option keys and imports populated legacy slot prices into versioned overrides. Re-running it is safe.

The signed canonical request is `timestamp + newline + nonce + newline + method + newline + path-and-query + newline + SHA-256(body)`. Timestamps have a five-minute window and nonces are single use.

## Production owner handoff

The owner handoff is deliberately evidence-only. Publishing and environment changes happen through the approved Netlify team; the verifier never changes configuration, never invokes the authenticated recovery job, and never sends a signed pricing request.

From the exact commit published to production, run:

```bash
pnpm revenue:verify-production
```

The matching scheduled/manual GitHub workflow is `.github/workflows/revenue-production-readonly.yml`. Configure `NETLIFY_AUTH_TOKEN` as a repository Actions secret, configure `REVENUEPILOT_BASE_URL` and `REVENUEPILOT_NETLIFY_SITE_ID` as repository variables, and keep `REVENUEPILOT_PRODUCTION_PROFILE=closed` until an approved one-tour staging change. The workflow performs read-only public and Netlify evidence calls; it never invokes maintenance or enables pricing.

The command fails unless all of the following are true:

- the latest ready Netlify production deploy matches local `HEAD`;
- `revenue-maintenance` is deployed on `*/5 * * * *`;
- a successful `/api/cron/pricing-summaries` recovery run occurred after that deploy and is no more than 12 minutes old;
- catalogue, apply and cron routes reject anonymous requests;
- HMAC rotation, read/write scopes, explicit tenant bindings, the movement cap and projection recovery are configured;
- pricing writes are disabled; and
- the production tour allowlist is empty.

For the separately approved one-tour staging step, keep writes disabled, configure exactly one approved tour, publish that environment change, then run:

```bash
REVENUEPILOT_PRODUCTION_PROFILE=canary-staged pnpm revenue:verify-production
```

This verifies only canary staging. It is not permission to enable writes and it does not replace the required shadow period, approvals, rollback drill, live observation or signed acceptance. If any check fails, keep `REVENUEPILOT_PRICING_API_ENABLED=false`, restore an empty allowlist for the closed posture, publish through the approved team, and rerun the default verifier.
