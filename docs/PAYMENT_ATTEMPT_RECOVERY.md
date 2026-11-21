# Payment Attempt Ownership and Recovery

The new issuance/recovery runtime remains local and is not deployed. Separately authorized production stock-ACL, migration-history and targeted legacy-data corrections are documented in `PRODUCTION_READINESS.md`; they do not authorize this release.

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

Pending orders created before the issuance guard cannot be classified as never-issued merely because the new marker is absent. The owner approved the controlled transition: pre-cutover pending orders remain verification-only, and new post-cutover orders follow normal atomic issuance. This may interrupt a historical unpaid checkout; it is an explicit safety tradeoff, not proof that every old order had a checkout page. Hosted metadata and bounded data checks have since been separately authorized; the six behavior migrations and this cutover remain unapplied.

The append-only cutover migration records `legacy_uncertain` separately from `application` issuance. It snapshots pending orders at a locked transactional boundary, preserves existing markers, and does not edit order/payment/inventory states. `issued_at` for a legacy marker means the uncertainty was recorded then, not that a checkout was proven issued then. No age-based or empty-lookup unlock is implemented.

### Release Runbook (Not Authorization to Execute)

Execution is blocked until an effective maintenance boundary, mixed-version handling and eligible hosting are established. The local handler gate below is implemented but not deployed or activated. It cannot fence older runtimes; hiding checkout UI or changing cron schedules is not enforcement.

1. Select an immutable candidate and an eligible hosting route under the owner's zero-paid-service constraint. Preserve unrelated working-tree changes. Obtain separate authorization for the exact deployment, six database migrations, temporary commerce pause and recovery procedure. Keep browsing available where possible; do not promise uninterrupted purchases.
2. Establish and test enforcement against every old writer: order creation, payment-parameter issuance, reconciliation, webhook processing, payment audit cron, reservation cleanup, order mutation and admin inventory writes. Include direct API requests, old deployment URLs, cached clients and already executing requests. Record the drain evidence before database changes. A later application-only flag cannot fence an older runtime that does not implement it.
3. Resolve webhook handling before execution. The variant migration rejects legacy stock confirmation for variant reservations; leaving the old webhook/reconciliation handlers writing unchanged is not a compatible bridge. Do not acknowledge an unprocessed payment event with HTTP 200. Wompi's [event documentation](https://docs.wompi.co/docs/colombia/eventos/) specifies at most three retries over the next 24 hours after a non-200 response, not an unlimited durable queue. Define a bounded retry or tested compatible-handler arrangement and follow-up reconciliation before selecting a maintenance window; no new queue or gate is supplied by this document.
4. Explicitly fence/drain both existing cron writers. Cleanup (`0 0 * * *`) retains its RPC signature but mutates reservations; payment audit (`0 13 * * *`) is a legacy payment writer. Do not let either cross the incompatible schema boundary unchecked. Re-read aggregate cohort/active-hold counts close to the window; prior snapshots are not current locks.
5. Apply these migrations individually in dependency order while the incompatible writers remain fenced: `20261112182940_atomic_wompi_finalization`, `20261112190344_rotate_payment_audit_queue`, `20261112194949_atomic_order_creation`, `20261112204615_authoritative_variant_inventory`, `20261114213626_single_payment_attempt`, `20261114221037_controlled_payment_cutover`. The stock-ACL migration is already applied and its history aligned; do not replay it. Check each committed version and exact function signatures/ACLs before advancing. Use a mechanism that preserves the intended migration identifiers or an explicitly authorized ledger reconciliation; do not silently recreate the earlier timestamp mismatch.
6. The cutover migration's lock/statement timeouts must abort its own transaction on contention. Every migration has a separate transaction: failure of migration six does not roll back the preceding five. Stop advancement after any failure and retain the maintenance boundary; do not retry the entire batch blindly.
7. Deploy only the tested runtime using the new RPCs after its database prerequisites exist. Missing RPCs are not a supported deployment state. Verify actual Data API schema visibility and role permissions, then guest/auth access, existing-order verification and a controlled new-order flow without real customer funds. Old webhook and cron versions must not regain write access during alias or runtime transition.
8. Resume commerce only after the compatible handlers are active, older writers cannot bypass the boundary and smoke checks pass. Monitor provider retries, the legacy cohort, cron execution and payment exceptions. Approved payments require provider verification and the common finalizer; uncertainty is not payment failure or cancellation.

Legacy follow-up is not an automatic release queue: a row remains marked until payment truth or a separately reviewed provider-backed recovery decision resolves it. Do not delete markers, change an order to failed, create a replacement payment or refund automatically to clear the queue. A public admin recovery UI, proof-backed unlock, universal paid-order audit and provider expiry/revocation proof are not delivered by this migration. Those limits must remain visible at release review.

### Local Commerce Maintenance Gate

`COMMERCE_MAINTENANCE_MODE` is a server-only configuration name, not a request header or a `NEXT_PUBLIC_` variable. Only the exact value `true` enables the local handler gate; unset and other values leave existing handler behavior unchanged. No environment file or remote configuration has been changed to activate it. On deployment platforms, changing configuration may require a new deployment; this is not an instantaneous cross-deployment switch.

The shared `lib/commerce/maintenance.ts` response is checked at the entry of commerce mutation handlers. While paused, it returns HTTP 503 with `code: commerce_maintenance`, `Retry-After: 60` and `Cache-Control: no-store` before parsing a body, route-level authentication, database work, provider requests or notifications. This generic pause response takes precedence over route-level validation/auth responses while enabled; it never grants access. Existing middleware/CSRF remains unchanged. When off, normal authentication, authorization and validation still run.

Covered methods are order POST/PUT/DELETE, product POST/PUT/DELETE, checkout-parameters POST, reconciliation POST, webhook POST and both GET/POST methods of reservation cleanup and pending-payment audit. Cron POST delegates to the guarded GET. Catalog/product GETs and other read-only handlers are not gated. There is no UI banner or storefront shutdown.

This handler gate is not a distributed lock, active-request drain, webhook queue, script guard or database access restriction. It cannot stop direct SQL, offline normalization scripts, already-running calls or an old deployment without the code. A blocked webhook is not acknowledged as processed and has only the provider's bounded retry behavior; a 60-second response header does not override Wompi's retry schedule. A separately tested old-writer fence and drain procedure is still required before applying the six behavior migrations.

Local coverage: `tsx --test tests/commerce-maintenance.test.ts` exercises the exported handlers with business/provider calls blocked, both cron methods, a catalog read and off-mode validation/signature/cron-auth behavior. This is not a hosted browser, provider or operational drain test.

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

Rollback depends on the committed boundary. Before any behavior migration, abandoning an unshipped candidate leaves the old runtime/schema unchanged. After the variant migration commits, returning traffic to the old runtime is not a proven safe rollback. Preserve schema, inventory attribution, issuance markers and duplicate-payment evidence; keep unsafe writers fenced and use a separately reviewed forward-recovery or proven compatible-runtime plan. Never drop evidence, run destructive down-migrations or restore a backup automatically. This document does not grant operational recovery authority.
