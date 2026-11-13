# Variant Selection

Scope: checkout-hardening T4c-selection, covering S1, S2 and S5. UI copy follows the existing neutral Spanish storefront; this contract is English.

## Catalog Authority

Products with variants require an existing unique variant ID. IDs are bounded text (1-200 characters, not whitespace-only), including historical non-UUID IDs. The request cannot supply the selection's name or price. Numeric positive or negative `priceModifier` values remain supported when the resulting price is finite and nonnegative.

The selected variant must have `inStock: true` and a positive integer `stock_quantity`. Every catalog entry must have a unique bounded identity, a nonempty name, boolean availability and nonnegative integer stock consistent with availability. Aggregate product stock must equal the sum of variant stock. Unknown or inconsistent catalogs fail closed; this layer does not repair historical inventory. Variantless products accept no variant ID and persist no client-supplied variant label.

Request and cart quantities are positive integers, capped at 100 per line. Demand is aggregated by product and variant, including duplicate lines. Cart changes replace line objects rather than mutate previously saved snapshots; forged selection objects are resolved against the product snapshot. Zero quantity retains the existing remove-item behavior.

## Replay and Transaction Boundary

Completed idempotent orders are authorized against the buyer before intent comparison and before reading the current catalog. Stored variant IDs define canonical selection identity, so client/catalog label differences do not prevent replay. Historical rows without IDs retain meaningful labels for replay comparison. Incomplete orders remain conflicts, and unique-key recovery still requires a fresh authorized matching order.

The API invokes only `create_order_with_stock`. JavaScript validation is not a concurrency guarantee: the parent-owned SQL engine must lock catalog state, account for active holds, reserve the selected variant and deduct the selected inventory transactionally. SQL `P0003` maps to 400 (invalid variant), `P0001` remains 400 (stock), and `P0002` remains 409 (catalog changed).

## Storefront

Variant cards leave navigation to the existing product-details link instead of adding an unspecified variant. Details use validated selection capacity, never a truthy fallback from zero variant stock to aggregate stock. Unavailable options and add controls are disabled, and handlers reject unavailable selections directly. Cart increments respect variant capacity and aggregate product demand; store guards remain authoritative for local mutations. These snapshots do not replace server freshness validation.

## Verification Evidence

The resumed partial implementation already passed its existing selection/store/replay tests; its earlier RED history was unavailable and was not reconstructed by deleting partial work. Fresh RED was observed for malformed sibling catalog entries, inconsistent aggregate inventory, unspecified card quick-add, and persisted forged variantless labels before those missing behaviors were fixed. A strengthened sibling-price test also failed before validation was added.

Node handler/store/component mocks exercise these contracts without installing a DOM or using external transports. They do not certify browser navigation, live provider behavior or the parent-owned database engine. Store tests can emit Zustand's expected unavailable-storage warning in Node. Parent integration and concurrency verification remain separate.
