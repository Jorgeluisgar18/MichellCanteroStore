# Admin inventory writes

Product edits send the loaded `inventory_version` as `expected_inventory_version`.
The version is never writable, and creation omits both version fields. Inventory
PUT requests require an integer version between 0 and 2147483647 and apply it in
the same UPDATE predicate. Missing or invalid versions return 400. Stale writes
and inventory constraint conflicts return 409 without retries or cache invalidation.
Reload the product and review quantities before submitting again.

Variant quantities are authoritative. Aggregate-only edits cannot disagree with
their sum. Historical aggregate/variant mismatches require an actual quantity
correction: saving unchanged allocation must not restore historical stock.
Published variant IDs must be unique and are not silently replaced. Numeric
price modifiers survive editor normalization and storage.

The normalization script reads the inventory version and uses the same CAS
predicate, aborting on zero affected rows or historical quantity mismatches.
It is not a historical repair/backfill tool. No script execution or database
connection is part of local route/helper verification.

CAS protects against stale product snapshots, not reservation rows. The parent
database migration must increment versions on inventory changes and enforce
held variant stock and reconfiguration rules transactionally with SQLSTATE 23514
inventory errors. Route tests stub persistence and do not prove those SQL guards.
