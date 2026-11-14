# Reload-Safe Creation Identity

An accepted addition to an empty cart creates a random cart-cycle UUID. The existing `cart-storage` record persists this additive `cartId` field. Quantity edits and catalog refreshes preserve it; clear, remove-last, quantity-zero and verified return cleanup reset it. Adding the same products after emptying creates a distinct purchase cycle. Native secure randomness is used, with `getRandomValues` support when `randomUUID` is unavailable.

Before order creation, checkout derives a domain-separated SHA-256 digest from that cycle and the existing canonical intent. Its first 128 bits are formatted as UUIDv8, accepted by the unchanged order schema. Equivalent intent in the same persisted cycle yields the same key after a remount or in another tab. Changed meaningful intent or a new cycle yields another key. Display snapshots remain excluded by the existing canonicalizer. No fingerprint, shipping data or key registry is newly persisted; only the random cycle is added. The resulting key is not an authentication credential: backend buyer authorization and atomic unique-key handling remain mandatory.

## Storage And Navigation Guards

Checkout waits for cart hydration before rendering the form or redirecting an empty cart. The shared hook handles hydration notifications, relevant storage events, storage removal/clear and browser history restoration. It removes subscriptions on unmount. Equivalent stored contents do not unnecessarily replace array snapshots.

Checkout also reads storage at asynchronous boundaries, rather than trusting that storage events have already arrived: before catalog work, before applying its result, after key hashing, after order/parameter reads and before handoff. Observed changes are adopted and stale submissions stop. Storage or cryptography failures never fall back to a fresh random attempt key. This is optimistic reconciliation, not atomic serialization of all browser writes; another tab can still edit after a check.

Hosted return contexts capture the cycle. Cleanup requires both matching cycle and contents, as well as verified backend payment and the existing one-time cleanup marker. Old contexts without a cycle may clear only legacy carts without a cycle, not a new identified purchase. A stored cycle or cleanup marker never verifies payment.

## Compatibility And Unfinished Work

Existing nonempty carts lacking `cartId` retain a stable explicit legacy namespace, not independently minted per-tab IDs. Identical legacy intent can consequently reconnect across browsers or later legacy sessions; this is not genuine cycle isolation. It cannot recover keys created by older random-key clients. No historical order guessing, restocking or database backfill is performed.

Paid, expired, failed or otherwise uncertain attempts are not silently replaced after reload or an access rejection. Existing backend rejection remains authoritative. A new accepted cart cycle is explicit; robust terminal retry/recovery UX remains separate work. Changing accounts does not bypass owner checks.

This unit reduces duplicate creation for a shared persisted cycle. It does not prevent opening two provider payment pages for the same order, globally serialize independent cart creation/edits, supply full guest receipts, or certify live-provider behavior. Those remain release gates. No new service, package, migration, cron or subscription is introduced.

## Checks

Run `tsx --test tests/checkout-attempt-cycle.test.ts tests/cart-session-hydration.test.ts tests/checkout-idempotency.test.ts tests/checkout-freshness.test.ts tests/checkout-return.test.ts tests/wompi-checkout-web.test.ts`, plus typecheck and the complete suite. Browser primitive tests may use intercepted synthetic origins without launching a development server; they are not full Next.js E2E proof. The previously denied preview launch must not be bypassed through another tool or delegate.
