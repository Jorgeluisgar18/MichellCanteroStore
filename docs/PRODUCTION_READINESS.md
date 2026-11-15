# Production Readiness

Status: NOT READY FOR RELEASE. Local payment/cutover proofs do not certify the deployed site, target migration ledger, provider behavior or hosting eligibility. No production access or deployment is authorized by this document.

## Release Gates

| Gate | Current evidence | Required next proof |
| --- | --- | --- |
| Free hosting eligibility | Owner requires zero paid subscriptions. Vercel's current Terms restrict Hobby to personal/non-commercial use. Actual plan or exception has not been inspected. | Choose an eligible deployment route; do not infer eligibility from quota usage or subscribe automatically. |
| Historical clean bootstrap | Verified opt-in regression: migrations-only reproduces the missing-audit failure; explicit prerequisite path completes all 34 migrations and retains both audit triggers without changing historical files. | Full Supabase-platform and hosted forward-upgrade compatibility remain separate proofs; do not inject the local platform stubs into a real database. |
| Forward upgrade compatibility | Individual payment/stock migrations have isolated fixture proof; actual hosted baseline and ledger are unknown. | Separately authorized, read-only target comparison before applying any migration. Clean replay and forward upgrade are different claims. |
| Production build | One isolated fake-environment build exited 1: outbound blocking prevented `next/font` from downloading Cabin, Great Vibes and Jost. Later build phases remain unverified. | Complete a controlled build with approved public-font access or verified local assets; no code defect was established by the offline failure. Never substitute production environment files. |
| Controlled cutover | Local `eda3b38` tests preserve old markers/payment/inventory and verify new issuance. | Separately approved release window, old-issuer pause/drain, target sizing and controlled smoke tests. See [payment runbook](PAYMENT_ATTEMPT_RECOVERY.md). |
| Provider reissuance | Hosted expiry observation inconclusive. | No automatic unlock/reissuance is enabled. Do not advertise that capability until provider-backed evidence exists. |
| Final hosted checks | No hosted end-to-end verification for this candidate. | Exact target/commit/environment approval, credential-presence checks without secret disclosure, callback/cron/alert checks and controlled Sandbox E2E. |

## Hosting Constraint

The official [Vercel Terms, Hobby Plan section](https://vercel.com/legal/terms) restrict usage to personal/non-commercial use. Do not mark this commercial store eligible for Hobby simply because its functions, images or cron schedules fit technical quotas. No exception or effective account plan is assumed here.

An official [Netlify announcement](https://www.netlify.com/blog/introducing-netlify-free-plan/) explicitly permits commercial projects on Free. That older announcement is not the source for current quotas: the current [credit-based billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/) says exhausted Free credits pause projects. Netlify is only a candidate for a compatibility/usage assessment, not an adopted provider or a guarantee of uninterrupted free operation. Changing provider requires approval and verification of Next.js rendering, functions, scheduling, images, redirects and observability.

## Evidence Boundaries

The opt-in regression is `RUN_DB_TESTS=1 tsx --test tests/migration-bootstrap-db.test.ts`. It creates a disposable PostgreSQL container with no external network or published ports, supplies explicit platform stubs, and compares two separate databases: migrations-only (expected documented failure), and explicit `supabase/audit_log.sql` loading immediately before the dependent historical index migration (expected complete replay). It checks real audit-trigger presence and unchanged migration hashes. It is not a production bootstrap command: do not execute the platform stubs or legacy prerequisite against an existing hosted database.

The first harness run used incorrect trigger names in its assertion; those names were corrected to match the existing audit SQL. That failed assertion was a test defect, not evidence that the actual triggers were missing. After Docker became available, the corrected regression passed on 2026-11-15 (1 test, no skips), including all 34 prerequisite-assisted steps, trigger presence and unchanged migration hashes. This confirms presence, not complete audit behavior or authorization semantics.

- Existing tests reconstruct selected database prerequisites; passing them is not full historical migration replay.
- Platform stubs in a disposable database are not a complete Supabase installation or an authorization/RLS proof.
- No application `schema.sql` or standalone `audit_log.sql` was silently preloaded in the migrations-only observation.
- No real customer/payment data, environment files or hosted credentials are used in these readiness probes.
- Published infrastructure, domain, webhooks, subscription plans and repository settings remain unchanged.
