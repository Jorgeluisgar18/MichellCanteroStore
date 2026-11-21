# Commerce Maintenance Bridge

This branch is based on deployed commit `a4020427939e89bcc723dae78bc9bf6626b6eb58`. It adds only the shared maintenance response and route-entry guards, not the newer checkout runtime or its six database prerequisites. It is a preparatory deployment candidate, not an instruction to activate maintenance or migrate production.

## Runtime Contract

- Only the server setting `COMMERCE_MAINTENANCE_MODE=true` pauses commerce. Unset, `false` and other values retain baseline handler behavior. Request headers cannot change this setting.
- While enabled, order/product mutations, checkout issuance, reconciliation, webhook processing and both existing cron writers return HTTP503 with `code: commerce_maintenance`, `Retry-After: 60` and `Cache-Control: no-store` before parsing bodies or calling business services. Both cron methods are covered.
- Product/catalog GET handlers remain unchanged. Middleware, CSRF, authentication, authorization and business logic remain unchanged when off.
- A blocked webhook is not acknowledged as processed. The response header does not override Wompi's bounded retry schedule. No durable queue, automatic refund, stock rewrite or new cron is introduced.
- No environment file, credential, dependency, migration, hosting plan or production alias is changed by this branch. Existing schema and payment defects are not fixed by deploying this bridge alone.

## Verification

The focused handler test first failed on the deployed baseline: checkout returned400 instead of the requested503. After adding the guards, the test passed for13 writer methods without body parsing or service calls. Product detail remained200; checkout retained its existing400 validation with the flag unset, false or uppercase TRUE. The baseline suite passed55/55 with no skips, TypeScript passed and focused runtime ESLint passed.

Independent verification passed52 paused requests with no parsing/auth/database/provider calls and156 disabled-mode comparisons against the exact baseline, matching statuses, bodies, headers and recorded calls. Product list/detail reads remained available, focused test and TypeScript passed, and source hashes were unchanged. Both cron POST exports make their GET modules non-static in the installed Next.js implementation. The parent reran the focused test successfully. This does not certify deployed caching or operational draining.

Commit `4546144` was published on the bridge branch and built as Vercel preview `dpl_GcL8jnLSpssLVEg7fD1H162CE7Px`, state READY. Its owner-authorized formal security, resilience and reliability review returned no findings; the exact native acknowledgement completed. That approval applies to the frozen source candidate, not to production activation, credential/configuration correctness or the operational preconditions below. The pause was not activated during these checks.

Read-only Vercel inspection on2026-11-21 found two custom domains: the apex redirect and public www storefront. The six-alias inventory had no next page: those two custom domains plus four Vercel deployment/branch aliases. Anonymous GET probes of the four Vercel aliases returned302 to Vercel login; empty checkout POST probes returned401. Earlier generated old-production and integration-preview URL probes also redirected to login. These are bounded requests, not proof that every path, bypass mechanism, authenticated operator or already-running request is fenced.

## Controlled Activation Preconditions

### Hosted Preview Evidence (2026-11-21)

With separate owner approval, the plain server setting `COMMERCE_MAINTENANCE_MODE=true` was configured only for target `preview` and Git branch `codex/commerce-maintenance-bridge`. Metadata readback showed no production entry. Deployment `dpl_9rT9PmnVrvdsRGRBKPwxcTo2my5N` rebuilt commit `a883df2` and reached READY with no production target.

A separately authorized deployment-specific share link was created with a 23-hour expiry and kept private. No project-wide automation bypass was created; fresh project metadata confirmed its absence. All 13 writer methods returned 503 with the maintenance code, retry value 60 and no-store headers. Requests used empty bodies, synthetic item identifiers, no application user/admin session or provider credentials, and a valid CSRF cookie/header pair. Product listing with limit 1, the returned product's detail and `/tienda` returned 200. These are HTTP handler/read proofs, not a rendered-browser or real payment journey.

The probe initially expected top-level rather than nested CSRF/catalog data and used an outdated in-memory CSRF binding. The resulting order request correctly returned 403; after correcting only the probe state, it returned the expected 503. No runtime or business-data change was needed. No order/payment was created by the probes; no before/after database hash comparison is claimed.

Fresh production metadata still identified `a402042` as READY and the public storefront returned 200. Production environment configuration, aliases and database migrations were not modified. Project metadata reports Fluid enabled, but did not provide an exact per-function duration limit. Neither Preview success nor a guessed wait certifies that old production requests have drained.

### Production Checklist

1. Freeze the bridge commit, check its hosted build and approve its exact deployment/environment. Configure the pause only for the intended production deployment, never by silently changing a shared setting. The application reads the setting per request, but Vercel environment changes can require a new deployment.
2. Before database work, verify the public domain serves the paused bridge: direct commerce mutation requests must receive the expected503 and product browsing must remain available. Verify internal old URLs cannot bypass protection. Include webhooks, both cron methods and authenticated administrative mutation paths in the test plan without sending real payment or inventory mutations.
3. Establish the actual maximum duration and drain of requests admitted to the previous production revision, including background work. Do not equate alias reassignment, a fixed arbitrary sleep or a local guard test with a proven drain. Keep operators and scripts from writing through bypass credentials or direct SQL during the window.
4. Account for payments already initiated at Wompi, provider retries and approvals arriving during the pause. Define bounded follow-up reconciliation before selecting the window. Already-issued provider parameters are not revoked by this bridge.
5. Only with the fence/drain verified, apply the six separately authorized migrations in order and retain the pause through partial failure. Then deploy the compatible integration runtime with the pause still enabled, check database API/ACL compatibility and only reopen after controlled smoke checks.

Before any behavior migration, the old runtime and old schema remain the rollback boundary. After incompatible schema changes, returning traffic to the baseline or unpausing this bridge is not a proven safe rollback. Keep unsafe writers paused and use the separately reviewed forward-recovery plan. No down-migration or automatic backup restore is authorized.
