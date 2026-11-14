# Payment Attempt Ownership and Recovery

Local implementation only. No production migration or deployment has been performed.

## Contract

An authorized checkout request must claim its order through `claim_wompi_checkout` before receiving signed Wompi fields. The RPC locks the order, requires pending order/payment states and full live product/variant reservation coverage, then stores one durable issuance marker. Concurrent calls have one winner. Existing markers return HTTP 202 with `payment_verification_required`, without signed fields. Elapsed time never releases ownership.

The browser saves its return context before requesting issuance. A network failure or existing issuance routes to confirmation rather than opening a second checkout. Confirmation can reconcile by the server-owned order reference when the provider transaction ID was lost. Up to five automatic follow-up checks run at five-second intervals; manual verification remains available. These checks never create a payment or release ownership. Provider-side retries stay within the already opened Wompi checkout.

Authenticated ownership and existing guest email/order boundaries remain mandatory before provider lookup or issuance. Malformed provider transaction data and ID/reference mismatches fail closed. A valid empty reference result means no matching transaction was observed, not that previously issued parameters are invalid or safe to reissue. Pagination completeness is not established and is never used to unlock.

## Duplicate Approval Evidence

The existing locked inventory finalizer remains the only payment writer. A second distinct verified approval for an already paid order creates an idempotent row in service-role-only `wompi_payment_exceptions`, preserving the canonical payment ID, fulfillment and inventory. It returns conflict with `duplicate_approved_payment`; existing incident capture handles that conflict. No automatic refund or normal fulfillment notification is produced for that exception.

Reference-based recovery sends all observed valid approvals through that same finalizer, rather than silently selecting only the first. The first finalized payment remains canonical; subsequent approvals require review. This is accounting and detection, not a provider-side prohibition against double charging.

## Rollout and Remaining Limits

- The migration must precede application deployment. Missing RPC/table fails closed; do not deploy the application alone.
- Previously issued checkout URLs cannot be revoked by this application marker. Existing pending orders from before migration have no marker. A release plan must account for them explicitly; do not claim the new guard covers those historical URLs or backfill guessed state.
- An issued response lost before navigation may have no Wompi transaction. Verification can observe that absence but cannot safely authorize another issuance. Fully automatic recovery of that case remains blocked on provider-backed expiry/revocation proof. No timeout unlock is implemented.
- This guard applies to application issuance for the same order. Copied provider parameters, new distinct orders and provider-side behavior are outside that exclusion boundary.
- The existing daily audit is not a complete scan of paid orders for additional charges. Missing webhooks plus an absent customer return can still require another monitoring design.
- No new dependency, paid service, cron or remote execution is introduced. Existing infrastructure quotas and plan eligibility are not certified by these local tests.

## Verification

`tsx --test tests/payment-attempt.test.ts tests/payment-finalization-routes.test.ts tests/wompi-adapter.test.ts`

`RUN_DB_TESTS=1 tsx --test tests/order-creation-db.test.ts` (isolated disposable PostgreSQL container, no hosted database).

`npm test` and `tsc --noEmit --incremental false`.

Rollback is one coherent unit: the issuance/recovery application changes and its new append-only migration. Never drop payment exception evidence or blindly roll back a migrated production database. Production rollback needs a separate reviewed plan.
