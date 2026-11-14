# Wompi Result Ownership

Checkout scopes each preparation/widget callback to its current mounted session. A valid result is claimed once before any reconciliation await. Repeated results and callbacks from superseded or unmounted sessions do not reconcile again or navigate the current UI. New submissions are blocked while a claimed result is being reconciled or navigation is pending.

Approval remains untrusted until the existing backend reconciliation route verifies the transaction. Existing success, manual-review and non-approved routes are preserved. After approval handling, the cart is cleared only if it is still the exact snapshot submitted; subsequent edits are preserved. Unmounting during reconciliation suppresses subsequent UI/cart changes, not server-side payment processing.

## Dismissal Limitation

The [official widget guide](https://docs.wompi.co/docs/colombia/widget-checkout-web/) documents `open(callback)` for transaction results, not a dismissal callback or completion promise. Read-only inspection of [the public widget script](https://checkout.wompi.co/widget.js) on 2026-11-14 found dismissal paths that close without invoking the merchant callback. This is an observation of a mutable vendor artifact, not a versioned API guarantee.

Consequently, this unit deliberately does not hold the submission lock indefinitely until a transaction callback: doing so would prevent retries after dismissal. Duplicate-open prevention for the entire visible-widget lifetime remains unresolved. There is no invented close API, iframe DOM observer, raw postMessage listener or timeout that assumes a payment ended.

Superseded UI callbacks can be ignored even if their provider transaction later succeeds. The backend webhook and scheduled reconciliation remain responsible for payment truth; UI callbacks are not the authoritative ledger. Reload and cross-tab retry persistence are separate pending work.

## Local Verification

Run `tsx --test tests/checkout-widget-lifecycle.test.ts tests/checkout-freshness.test.ts tests/checkout-idempotency.test.ts`. The harness invokes real component handlers with mocked hooks, catalog/payment transports and widget callbacks. It does not prove live overlay dismissal, redirect navigation or browser/provider compatibility. No provider payment requests are required.
