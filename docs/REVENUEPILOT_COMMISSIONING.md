# RevenuePilot one-time commissioning gate

Mountain Tour TourTicket supports a separately armed, exact-target commissioning request so the owner can prove one RevenuePilot write/read-back/restore path without enabling normal pricing execution.

Normal execution remains closed:

```text
REVENUEPILOT_PRICING_API_ENABLED=false
REVENUEPILOT_ALLOWED_TOUR_IDS=
```

Commissioning requires all four matching server variables:

```text
REVENUEPILOT_COMMISSIONING_ENABLED=true
REVENUEPILOT_COMMISSIONING_CONFIRMATION=ENABLE_MT_ONE_TIME_COMMISSIONING
REVENUEPILOT_COMMISSIONING_TARGET=<tenantId>|<tourId>|<optionKey>|<YYYY-MM-DD>|<HH:mm>
REVENUEPILOT_COMMISSIONING_NOT_AFTER=<valid ISO instant no more than 24 hours away>
```

The signed request must use `mode=commissioning`, the exact target, confidence 100, a one-percent policy cap, 100 minimum confidence and 24-hour cooldown. TourTicket independently reads the current price and rejects any paid guest change that is zero, over one percent, or over USD 1; a zero-priced guest must remain zero. Existing HMAC write scope, nonce replay protection, source version, expected version, publication, immutable option mapping, exact departure, stop-sale and capacity checks still apply.

Rollback stays available through the existing signed execution rollback contract after the commissioning window expires. RevenuePilot must verify both machine execution state and the public quote before accepting either apply or restoration.

This gate does not create bookings or payments, does not enable ordinary RevenuePilot pricing, and does not authorize changes to sibling repositories. Follow the owner-approved RevenuePilot commissioning runbook; immediately disarm the four variables after the test.
