# Atomic Payment Finalization

## Scope

`finalize_wompi_payment` is the shared transaction boundary for the Wompi webhook,
customer reconciliation and daily payment audit. Only `service_role` may execute it.
The caller must verify the provider record first; the database independently checks
the order reference, currency and exact amount under an order lock.

An approved payment and inventory readiness are separate facts:

- `confirmed`: inventory is accounted for; normal fulfillment may proceed.
- `review_required`: payment is recorded as paid, but inventory cannot safely be
  confirmed. Fulfillment transitions are blocked by a database trigger.
- `unverified`: historical or not-yet-finalized inventory; no automatic backfill
  certifies old orders merely because they were already marked paid.

Expired and released holds are recovered automatically from order-item demand when
physical stock minus other orders' active holds is sufficient. Repeated historical
reservation attempts are not added to that demand. Matching confirmed reservations
are reused without another deduction; partial legacy deductions remain exceptions.
An approved payment may recover a previously failed/cancelled order with available
inventory. Refunded payments and a second transaction on an already paid order are
conflicts, not automatic fulfillment. No automatic refund is implemented.

## Verification

Run `npm test` and `npx tsc --noEmit --incremental false`.
For disposable local PostgreSQL tests in PowerShell:

```powershell
$env:RUN_DB_TESTS = '1'
npx tsx --test tests/payment-finalization-db.test.ts tests/stock-rpc-permissions.test.ts
Remove-Item Env:RUN_DB_TESTS
```

Docker must be running. Containers use `postgres:17-alpine`, expose no host port,
contain synthetic data, and stop in `finally`. These fixtures verify the actual
new transaction function, but do not certify replay of the complete historical
Supabase schema, hosted role memberships, deployed secrets, or live provider delivery.
Route tests invoke real handlers with local provider/database transports; no real
Wompi charge, email, or hosted database mutation is performed.

## Deployment Boundary

Nothing here authorizes production migration, deployment or historical reconciliation.
Before a future release, review actual hosted schema compatibility and the legacy
inventory cases, confirm service-role/provider credentials without exposing values,
and pause/drain payment writers for a bounded cutover. Apply additive migrations
before switching all application writers, then resume and reconcile missed events.
Do not run old and new stock/payment writers concurrently during a rolling cutover.
Do not drop inventory evidence or columns when rolling application code back.

## Remaining Work

The daily cron schedule is unchanged. Its batch fairness and 30-day selection limit
still require the separate T3 audit-queue change; this unit does not promise bounded
recovery time when notifications are missed. Paid inventory exceptions are eligible
for the existing audit window and can recover automatically after replenishment.
Email notifications run after commit, but durable outbox/retry delivery remains T6.
Variant-level availability remains T4. Full controlled checkout E2E and production
readiness remain T9. No new hosted service or paid scheduler is introduced.
