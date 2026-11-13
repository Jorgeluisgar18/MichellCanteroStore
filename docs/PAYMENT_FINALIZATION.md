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

### Authoritative Variant Inventory

Variants represent physical remaining quantities. New reservations carry a per-variant
allocation map; `NULL` means historical/unattributed evidence and is not automatically
backfilled. Unknown active product holds conservatively consume variant availability.
Creation and approved-payment recovery validate the selected identity and its free
quantity under the same product locks used by stock mutations.

The variant-aware transaction wrappers retain the prior payment validation/rollback
logic in private implementations (not executable by service/client roles). Approval
deducts product and selected variant quantities atomically and records attributed
confirmation evidence. Replays do not deduct again. A shortage persists paid status
with a fulfillment hold; replenishment can resolve that shortage automatically.
Historical paid/confirmed inventory without variant evidence stays explicitly
uncertain across retries and replenishment; it is not silently deducted again.

Inventory versions protect admin saves from overwriting sales. Database guards also
protect active reservations and require consistent variant totals when allocations
are edited. See `INVENTORY_ADMIN.md` and `VARIANT_SELECTION.md` for client contracts.
The migration requests a Data API schema-cache refresh after adding/rebinding RPCs,
using the [documented Supabase notification](https://supabase.com/kb/troubleshooting/refresh-postgrest-schema).
Release checks must still confirm the hosted API recognizes the new signatures and grants.
Neither the migration nor the normalization script repairs historical stock. Before
release, inventory discrepancies and legacy allocation evidence require a controlled
read-only preflight and an approved correction plan, not inferred restocking.

### Order Creation Retries

The mounted checkout retains its idempotency key after a transport or parameter
error when meaningful request data is unchanged. A synchronous request guard blocks
overlapping submissions before React rerenders. Changes to contact/shipping data,
product/variant selections or quantities create a different intent; display-price
snapshots do not define identity. The fingerprint stays in component memory and is
not written to browser storage or logs. Reloads and other tabs are not coordinated.

The order API authorizes the buyer before comparing replay intent. A matching,
complete order is returned without reserving inventory again. Reusing a key with
changed intent returns 409; incomplete item sets are a retryable 409 with `Retry-After`. A unique insert
failure only becomes replay success after a fresh matching, authorized, complete
order lookup. Other unique failures retain their error response.

Order, item and reservation creation now share `create_order_with_stock`, executable
only by the service role. The API retains buyer validation and authoritative catalog/
shipping calculations; the RPC locks products in stable order and rechecks effective
prices/names against those snapshots. A catalog change produces a retryable conflict.
It aggregates demand by product and uses the existing stock helper with 30-minute
expiry. A helper JSON failure is raised, so the order, items, prior holds and transactional
order audit writes roll back together. Item-insert failures also roll back all holds.
Initial creation remains 201 with `items`; same-key ready replay remains 200 with
`order_items`. No fallback to the old multi-request creation path is used.

An abandoned partial creation from older code is not deleted or resumed automatically.
Those historical rows require a separately controlled repair. Payment eligibility
still requires the separate checkout-parameter checks.
The guard covers network submission, not the entire third-party widget lifetime;
no undocumented widget-close API is assumed. Full DOM/browser and live-provider
checkout verification remains pending.

The daily cron schedule is unchanged. Its service-role-only claim RPC rotates at
most 25 Wompi orders per invocation, including historical pending/failed payments
and paid inventory exceptions. There is no 30-day cutoff. A private, RLS-enabled
progress table records claims without changing order timestamps or creating business
audit snapshots. Claims expire after 15 minutes; failed or interrupted attempts can
be retried later. This is not proof that an earlier worker has stopped. Atomic payment
finalization remains responsible for avoiding duplicate stock effects.

The limit bounds returned work, not total database scan cost. Recovery time depends
on backlog, daily invocation, provider availability and execution limits; there is no
immediate recovery guarantee when notifications are missed. Paid inventory exceptions
can recover automatically after replenishment. Provider HTTP timeouts and complete
runtime/quota certification remain release-readiness checks, not inferred guarantees.
Email notifications run after commit, but durable outbox/retry delivery remains T6.
Variant-level availability remains T4. Full controlled checkout E2E and production
readiness remain T9. No new hosted service or paid scheduler is introduced.
