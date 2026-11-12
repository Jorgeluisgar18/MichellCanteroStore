# Checkout Hardening
Local integration branch: `codex/checkout-hardening-integration`; delivery: feature-branch-chain, no publishing or production mutations authorized.
Runner: `npm test`; opt-in local PostgreSQL permission tests. Forecast: several thousand authored lines across separate work units.

## Specs
- S1: "es cierto debemos corregir esta parte y todo lo que hemos detectado durante las pruebas". Scope: findings in the November 12 audit reports; preserve existing customer workflows and separate production recovery from local fixes.
- S2: "ok vamos y procedemos de una con las pruebas". Observe regression failures before fixes and verify isolated state without real orders or provider calls.
- S3: "todo lo que usemos debe estar siempre dentro los planes gratis". No new paid services; quota and plan eligibility gaps remain explicit, not certified by local tests.

## Tasks
- T1 [S1,S2] inline, in progress: restrict four stock RPCs to service_role; PostgreSQL ACL regression tests; independent security verification. Commit: pending.
- T2 [S1,S2] inline, pending: atomic payment finalization across all terminal writers; inventory-review persistence and fulfillment hold; concurrency tests. Product decision pending for approval after failed/cancelled payment.
- T3 [S1,S2,S3] inline, pending: audit queue progress, historical coverage and transaction lookup recovery; bounded daily execution.
- T4 [S1,S2] inline, pending: checkout attempt idempotency, variants and cart correctness; guest receipt access.
- T5 [S1,S2] inline, pending: account/admin privacy, redirects, last-admin and profile/address semantics.
- T6 [S1,S2,S3] inline, pending: observability initialization, email reliability and rate-limit isolation.
- T7 [S1,S2] inline, pending: catalog navigation/search, accessibility and image fallback/assets.
- T8 [S1,S2] inline, pending: clean historical database bootstrap and migration verification without rewriting applied history.
- T9 [S1,S2,S3] inline, pending: supported dependencies, safe scripts and CI; controlled complete E2E and release readiness.

## Log
- L1: "es cierto debemos corregir esta parte y todo lo que hemos detectado durante las pruebas"
- L2: User approved an integration branch and then: "ok vamos y procedemos de una con las pruebas". No deployment, production migration or real-order reconciliation authorized.
- L3: Existing modified documentation, `.atl/` and `supabase/.temp/` predate this implementation and must remain untouched.
- L4: Read-only payment mapper completed. All terminal writers need the same locked transaction; verified payment and inventory readiness must remain separate. T1 can proceed independently.
- L5: Engram mirror unavailable: project resolver previously matched workspace, but memory writes return `unknown_project`. Local document is authoritative until mirror recovers.
- L6: T1 risk: item 1 (migration), item 2 (execution permissions). Test fixture isolates PostgreSQL ACL semantics; it does not certify checkout or hosted migration compatibility.
- L7: Observed RED with the CLI-generated empty migration: `has_function_privilege('anon', ...)` returned true instead of false. CLI generated version `20261112150230`. No historical SQL files changed.
- L8: T1 focused GREEN: 18 tests passed, including PostgreSQL execution-denial/no-mutation and service_role success. General suite: 54 passed, 1 opt-in database test skipped (executed separately). `git diff --check` passed with existing line-ending warnings. Independent verifier and native review pending.
- L9: Independent verifier found no T1 blockers and reproduced baseline failure/fixed success in isolated PostgreSQL. Advisory: backend requires its service-role key; existing anonymous fallback correctly loses access. Typecheck caught two unchecked array reads in tests; explicit assertions added before use. Verifier scratch retained at `C:/Users/ASUS/AppData/Local/Temp/stock-verifier-fcce15b2a7ba4298b1ad39324e0e0282`; no secrets or running containers.
