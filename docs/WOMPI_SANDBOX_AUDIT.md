# Authorized Sandbox API Audit

This manual runner is separate from the application and its production Wompi adapter. It loads only `.env.sandbox.local` through Node's structured environment parser; it does not load production files or use ambient credential values. The existing Git ignore rules exclude this file. Required prefixes are `pub_test_`, `prv_test_`, `test_integrity_`, with explicit `WOMPI_SANDBOX_EVENTS_ISOLATED=true` after the owner verifies that Sandbox events cannot target production.

The API origin is fixed to `https://sandbox.wompi.co/v1`. Redirects are rejected. There is no URL/file override flag. TLS verification must not be disabled. This tool must never be adapted to production by substituting its origin or keys.

## Commands

- Read-only: `tsx scripts/audit-wompi-sandbox.ts`
- Explicit authorized mutations: `tsx scripts/audit-wompi-sandbox.ts --transactions`
- Mocked safety tests: `tsx --test tests/wompi-sandbox-audit.test.ts`

The mutation mode is capped at six transaction requests and 100 total requests, with a 15-second timeout per request and eight bounded status reads per created transaction. Amounts are fictional COP 10,000. Only official approved/declined test-card fixtures can be tokenized; no real card/customer data is accepted. Each attempt uses a fresh test token. The matrix observes an approved reference repeated, a declined reference retried with an approved fixture, and two concurrent approved-fixture requests sharing one new audit reference. It does not assert in advance that Wompi must reject those cases.

References begin `AUDIT-SBX-` and are emitted before creation so uncertain outcomes can be investigated without blindly repeating a mutation. Unknown POST outcomes stop the run; do not rerun mutation mode to resolve them. Query the recorded reference instead. Exit 2 means stopped/inconclusive; exit 3 means multiple distinct approvals were observed for one reference, not a safe production result. Exit 0 means the bounded observations completed, not that the entire checkout is certified.

Output is restricted to audit references, transaction identifiers, amount/currency, states, HTTP codes, approved error-type/field names and metadata schema keys. Keys, merchant personal data, acceptance tokens, card tokens and full provider responses are never printed or persisted by the runner. Do not manually log client method payloads: merchant/token data exists transiently in memory for the API flow.

## Evidence Limits

Each transaction attempt fetches and validates its own current pair of acceptance tokens immediately before the POST, including concurrent attempts. A failed acceptance read prevents that attempt from creating a transaction. Tokens are not cached across the matrix. This prevents cross-attempt reuse; it does not assert that every provider acceptance error has the same cause.

These are real Sandbox API observations, not application-order/stock tests and not proof of hosted-page expiration, session revocation, provider uniqueness guarantees, eventual-consistency bounds or behavior with real money. No application API or Supabase operation is part of this runner. A complete reference list is not assumed merely because this lookup returned an array; production reconciliation must handle validation and pagination separately.

Contracts: [environments and keys](https://docs.wompi.co/docs/colombia/ambientes-y-llaves/), [acceptance tokens](https://docs.wompi.co/docs/colombia/tokens-de-aceptacion/), [test fixtures](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/), [transactions](https://docs.wompi.co/docs/colombia/transacciones/), [retry semantics](https://docs.wompi.co/docs/colombia/reintento-de-pago/). The current documented merchant-info endpoint passes the public key in `x-merchant-public-key`, not the URL.

## Observed Sandbox Matrix: 2026-11-14

Run suffix: `5b71f575-5a6b-40f0-a400-0400e129b096`. Six transaction POSTs, no production application/database activity:

- Approved first: HTTP 201, verified APPROVED by ID.
- Sequential repeat of approved reference: HTTP 422, reference validation error.
- Declined fixture: HTTP 201, verified DECLINED by ID.
- Approved fixture after that decline, same reference: HTTP 201, verified APPROVED under a different ID.
- Concurrent approved fixtures, same new reference: both HTTP 201; both distinct IDs verified APPROVED. Reference lookup also returned both approved rows.

The runner emitted `multipleApprovalsObserved:true`; the tsx command wrapper returned exit 1 rather than preserving the script's configured exit 3. Use structured observations, not that wrapper exit alone, to interpret this run.

This is evidence against assuming reference uniqueness is sufficient concurrency protection in the tested Sandbox direct API. It is not proof that the production hosted checkout has the same behavior. Do not ship a timeout-based unlock or treat an existing payment page as revoked. Production launch ownership and multiple-approval reconciliation need a separately tested design before deployment.

Fetching tokens per attempt allowed the matrix to complete; the prior acceptance rejection's exact provider-side cause remains unproven. This audit does not claim all acceptance failures are fixed by token refresh.
