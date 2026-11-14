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

### Hosted Expiry Observation (2026-11-14)

An isolated browser probe used only the dedicated Sandbox public/integrity test keys, fresh audit references and signed `expiration-time`. It entered no customer/card data and initiated no payments. Private keys were not sent to the browser. Requests were restricted to exact Wompi checkout/Sandbox/asset hosts; POSTs, redirects, service workers and WebSockets were blocked. Google/Hotjar remained blocked. No URL, signature, merchant payload, screenshot or credential was logged or persisted.

Initial pages did not render because necessary Wompi Sandbox/asset hosts were excluded. A bounded diagnostic identified the hosts; adding those exact hosts permitted partial rendering. The final observation had one rendered sample and three blocked auxiliary POSTs, with inconsistent rendering across before/after/reload samples. A broad text classifier is not authoritative expiry evidence. Neither command exit zero nor absence of inputs proves payment rejection. Result: INCONCLUSIVE, not passed.

The official [Web Checkout contract](https://docs.wompi.co/docs/colombia/widget-checkout-web/) documents an expiry for starting payment and requires including it in the integrity signature. It does not establish that an already initiated payment is cancelled at that time. No automatic unlock, production change or provider-guarantee claim follows from this probe.

### Historical Orders: Approved Controlled Transition (Local Only)

Pending orders created before the issuance guard cannot be classified as never-issued merely because the new marker is absent. The owner approved the controlled transition: pre-cutover pending orders remain verification-only, and new post-cutover orders follow normal atomic issuance. This may interrupt a historical unpaid checkout; it is an explicit safety tradeoff, not proof that every old order had a checkout page. No hosted database has been inspected or changed.

The append-only cutover migration records `legacy_uncertain` separately from `application` issuance. It snapshots pending orders at a locked transactional boundary, preserves existing markers, and does not edit order/payment/inventory states. `issued_at` for a legacy marker means the uncertainty was recorded then, not that a checkout was proven issued then. No age-based or empty-lookup unlock is implemented.

### Release Runbook (Not Authorization to Execute)

1. Obtain separate production release authorization, including the temporary checkout-issuance pause. Keep browsing available where operationally possible; do not promise a zero-interruption cutover.
2. Disable all old application payment-parameter issuance, including cached/older deployments; drain requests already executing. A database snapshot alone cannot stop an old runtime from signing parameters outside the new RPC. Keep webhooks able to retry if the migration lock temporarily delays finalization.
3. Apply prerequisite migrations and the controlled-cutover migration in order during the issuance pause. Its bounded lock/statement timeouts must abort and roll back on contention, not wait indefinitely. Estimate the pending cohort and migration size beforehand using separately authorized read-only production access.
4. Deploy only the tested application version that uses the claim RPC. Verify guest/auth access, existing-order verification, a controlled new-order flow and incident capture. Never test purchases with real customer money as a deployment smoke test.
5. Re-enable issuance only after no old version can issue signed parameters. Monitor the legacy cohort through existing bounded reconciliation and payment-exception tooling. Approved payments follow the existing verified finalizer; uncertainty is not payment failure or cancellation.

Legacy follow-up is not an automatic release queue: a row remains marked until payment truth or a separately reviewed provider-backed recovery decision resolves it. Do not delete markers, change an order to failed, create a replacement payment or refund automatically to clear the queue. A public admin recovery UI, proof-backed unlock, universal paid-order audit and provider expiry/revocation proof are not delivered by this migration. Those limits must remain visible at release review.

Authorized operators can track the cohort without exposing customer details using a read-only aggregate (do not run against production without separate authorization):

```sql
SELECT a.issuance_origin, o.payment_status, count(*) AS orders
FROM public.wompi_checkout_attempts a
JOIN public.orders o ON o.id = a.order_id
GROUP BY a.issuance_origin, o.payment_status;
```

The existing daily bounded reconciliation can recover verified approvals; the origin marker remains historical evidence after payment resolution. It is not an instruction to retain stock forever: existing reservation expiry and verified payment/inventory recovery rules remain unchanged. No new cron, subscription or dependency is introduced.

`tsx --test tests/payment-attempt.test.ts tests/payment-finalization-routes.test.ts tests/wompi-adapter.test.ts`

`RUN_DB_TESTS=1 tsx --test tests/order-creation-db.test.ts` (isolated disposable PostgreSQL container, no hosted database).

`npm test` and `tsc --noEmit --incremental false`.

Rollback is one coherent unit: the issuance/recovery application changes and its new append-only migration. Never drop payment exception evidence or blindly roll back a migrated production database. Production rollback needs a separate reviewed plan.
