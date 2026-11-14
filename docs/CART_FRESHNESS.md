# Checkout Catalog Freshness

Before creating an order, checkout reads each unique product through the existing public per-ID API with `cache: no-store`. Reads run in groups of four with a ten-second timeout per request. No polling, new service, dependency or migration is required.

Current catalog variants replace saved display snapshots only after all selections and aggregate quantities validate. Product and variant identities and quantities are preserved. Missing products, unavailable selections, invalid inventory and failed reads block submission without deleting cart lines.

The store replaces only the exact array read before the request. Edits or removals during refresh reject the old result. A changed line price updates the summary and stops that attempt; the buyer must submit again to accept the displayed total. Checkout line amounts include variant modifiers.

Order creation remains authoritative and transactional. Checkout additionally requires the returned order total and Wompi amount in cents to match the reviewed total. It checks that the cart has not changed again before opening the widget. A mismatch opens no payment; an already-created order is not silently replaced with a new retry identity.

## Verification And Limits

Run `tsx --test tests/cart-freshness.test.ts tests/checkout-freshness.test.ts tests/cart-variant-guards.test.ts tests/checkout-idempotency.test.ts`.

Tests use mocked catalog/payment transports, real store actions and a hook harness, not a browser or live Wompi. Initial page entry does not refresh automatically; validation occurs on submission. Cross-tab synchronization, persisted retry identity, already-open widget lifecycle and historical order repair remain separate work. Catalog reads are advisory and do not reserve stock or guarantee availability until the backend transaction succeeds.
