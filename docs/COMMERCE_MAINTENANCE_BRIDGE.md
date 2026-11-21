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

### Verified Lifetime and Database Preconditions (2026-11-21)

The previous metadata gap was resolved using the installed CLI's supported `vercel inspect <deployment> --format=json`, rather than the newer documentation's `--json` spelling. Inspection of exact production deployment `dpl_DG9FArd7NJLVNzJ5XHx6hGUhTf14` reports `nodejs24.x` and `timeout: 300` for all nine commerce route paths, including both cron writers. This is actual deployment evidence, not a guessed default. Vercel documents that the [maximum duration terminates an overlong invocation](https://vercel.com/docs/functions/configuring-functions/duration).

Read-only Supabase catalog inspection reports `authenticator` statement and lock timeouts of 8 seconds, `anon` statement timeout of 3 seconds and `authenticated` statement timeout of 8 seconds. No timeout override was found on the four existing stock RPCs. The inspection session itself is `postgres` with a two-minute statement timeout and no lock timeout; it is not the Data API session. Supabase documents the [service-role fallback to authenticator settings](https://supabase.com/docs/guides/database/postgres/timeouts). These catalog settings do not prove current PostgREST cache state or bound upstream HTTP/network queues.

Baseline source mapping found no explicit detached commerce continuation in the nine routes. Provider and email calls are awaited but have no application-defined request deadline. The old webhook can await email delivery before its final order update; order creation and compensation span separate database requests. Therefore a database-idle sample taken during that wait is not a completed drain.

At `2026-11-21T18:48:37Z`, a read-only aggregate returned: 28 migrations recorded, none of the six pending release versions present, zero orders without items, zero reserved/live/expired-reserved rows, zero other holders of the inspected commerce relation lock modes and zero authenticator sessions in a transaction. Production was still open. These are preflight observations only; repeat them after closing old admission and settling old invocations. They are not a production-drain certificate or proof that every historical payment/inventory state is correct.

The release sequence must retain two separate barriers: first close all old admission and settle old function lifetimes; then verify that downstream database work has settled and inspect interrupted-flow consistency. The observed 300-second bound applies only after the last possible old invocation start is established. Do not label five minutes from alias reassignment, a client disconnect, missing log lines or an earlier zero-count sample as sufficient proof. If queued starts or any old access path remain uncertain, keep migrations blocked rather than inventing a queue allowance.

### Reversible Production Rehearsal (2026-11-21)

The owner separately authorized a production pause, bounded drain observation and reopening, explicitly excluding the six behavior migrations. Runtime files in bridge commit `6aff9d0` matched approved `4546144`; the focused maintenance test passed again before activation. The existing original production deployment `dpl_DG9FArd7NJLVNzJ5XHx6hGUhTf14` (`a402042`) was retained as the restoration target.

A temporary Production-only maintenance entry was created, separate from the existing branch-Preview entry. The exact bridge was rebuilt with Production configuration as `dpl_FQtE2E3uiWsNEYepb58DCuHMbwb9`; no Preview build was simply assigned to the public domain. After READY and alias assignment, all 13 public writer methods returned the expected retryable maintenance response, and catalog list, detail and `/tienda` returned 200. Requests contained no real order/payment payload or application user/admin credentials.

Anonymous checks of the original generated deployment URL and main-branch alias redirected to Vercel authentication. Observation began at `2026-11-21T18:58:19.609Z`, after these checks and the public-domain alias inspection. A measured 327 seconds elapsed before the final database sample. Initial, intermediate and final samples showed zero authenticator transactions and zero holders of the inspected commerce write-related relation locks. Initial and final samples also showed no orders without items or live/expired-reserved rows. The 28-entry migration ledger retained digest `6811a05cff663c9eab7a570ffccf44fb`; no migration was applied.

The original Production build was re-promoted without rebuilding. A guarded metadata check identified the unique temporary Production entry before removing it; the Preview entry remained intact. At `2026-11-21T19:04:25.796Z`, an empty checkout request with valid CSRF returned its baseline 400 without the maintenance code or retry header, while catalog and storefront returned 200. The `www` alias pointed to the original deployment and no Production maintenance entry remained. Purchases were reopened before handback.

An independent read-only verifier subsequently confirmed the original alias, READY production source, public homepage 200, absence of the temporary Production entry, preservation of Preview maintenance metadata and the unchanged 28-entry ledger fingerprint with all six pending versions absent. The parent repeated the homepage check successfully. This verifies current restoration, not the independent historical execution of every rehearsal step or provider payment truth.

These are bounded operational observations, not proof of every internal platform queue, operator bypass or provider event. No real purchase, provider lookup, webhook replay, inventory repair or refund was performed. Provider retry delivery during or after the pause was not verified. No whole-business-data before/after hash claim is made. A future migration window must repeat admission and drain checks and account for payment events; this rehearsal does not authorize that release or prove restoration to old code would be safe after incompatible schema changes. The paused trial build retains its own configuration snapshot and must not be promoted unintentionally.

### Migration Window Sequence

1. Freeze the bridge commit, check its hosted build and approve its exact deployment/environment. Configure the pause only for the intended production deployment, never by silently changing a shared setting. The application reads the setting per request, but Vercel environment changes can require a new deployment.
2. Before database work, verify the public domain serves the paused bridge: direct commerce mutation requests must receive the expected503 and product browsing must remain available. Verify internal old URLs cannot bypass protection. Include webhooks, both cron methods and authenticated administrative mutation paths in the test plan without sending real payment or inventory mutations.
3. Establish the actual maximum duration and drain of requests admitted to the previous production revision, including background work. Do not equate alias reassignment, a fixed arbitrary sleep or a local guard test with a proven drain. Keep operators and scripts from writing through bypass credentials or direct SQL during the window.
4. Account for payments already initiated at Wompi, provider retries and approvals arriving during the pause. Define bounded follow-up reconciliation before selecting the window. Already-issued provider parameters are not revoked by this bridge.
5. Only with the fence/drain verified, apply the six separately authorized migrations in order and retain the pause through partial failure. Then deploy the compatible integration runtime with the pause still enabled, check database API/ACL compatibility and only reopen after controlled smoke checks.

Before any behavior migration, the old runtime and old schema remain the rollback boundary. After incompatible schema changes, returning traffic to the baseline or unpausing this bridge is not a proven safe rollback. Keep unsafe writers paused and use the separately reviewed forward-recovery plan. No down-migration or automatic backup restore is authorized.
