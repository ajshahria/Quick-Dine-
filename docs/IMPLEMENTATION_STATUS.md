# Implementation and evidence — 17 October 2026

The backend, cookie authentication, and automated suites are implemented locally. Deployment is in progress; the existing public websites do not yet prove that these changes are live.

## Verified local results

| Suite | Passed / total | Failed / skipped | Pass rate | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|---:|---:|---:|
| Jest + Supertest API | 41 / 41 | 0 / 0 | 100% | 97.76% | 93.91% | 98.11% | 97.76% |
| Vitest + React Testing Library | 47 / 47 | 0 / 0 | 100% | 89.59% | 77.65% | 84.47% | 90.90% |

Both builds and frontend lint pass. Reports: [counts](evidence/tests/results-summary.json), [API coverage](evidence/tests/api-coverage.json), [frontend coverage](evidence/tests/frontend-coverage.json). Full HTML reports are generated under each application's `coverage/` directory. [GitHub Actions run 39037579672](https://github.com/ajshahria/Quick-Dine-/actions/runs/39037579672) passed both jobs on commit `1f494ee58079e798c8f1d99534cabef0920098c9`, publishing [API artifacts](https://github.com/ajshahria/Quick-Dine-/actions/runs/39037579672/artifacts/12102359024) and [frontend artifacts](https://github.com/ajshahria/Quick-Dine-/actions/runs/39037579672/artifacts/12103090534). Local percentages above come from the saved local reports; hosted artifacts are the authoritative CI results.

The first CI attempt failed during `npm ci` because of missing platform-specific lockfile entries with the runner's newer npm. The frontend lockfile was repaired in a clean directory, and Node was pinned to the tested 24.12.0 runtime on Ubuntu 24.04. The subsequent clean CI installation, builds, lint and suites passed.

API tests use a disposable MongoDB 7.0.14 replica set, never the developer's Atlas database. The Windows sandbox blocks its local socket: running the same command with permitted local networking succeeds. Frontend journeys use MSW and the Axios fetch adapter in tests; the real browser retains Axios's normal adapter. Coverage is evidence of exercised code, not proof of every possible input or attack.

## Implemented behavior

- `GET /api/restaurants?cuisine=Italian` supports exact, case-insensitive cuisine selection and repeated cuisine parameters, combined with existing filters.
- Dates use YYYY-MM-DD and Asia/Dhaka business time. New bookings must be in the next 90 days, in a configured future slot, with an integer party size from 1 to 10,000 and sufficient remaining seats.
- Each new booking persists a name/email/phone snapshot independently of the account. Legacy bookings remain readable without invented contact details.
- Capacity uses confirmed bookings only. All capacity-affecting operations write the restaurant's revision inside a MongoDB transaction before reading allocations. Competing writes conflict and retry. Cancellation is idempotent; cancelled/completed bookings cannot be re-confirmed. Owner capacity/slot edits cannot invalidate active allocations.
- A one-hour JWT is held in an HttpOnly, production-Secure, SameSite=Lax cookie. Server-side session records support logout revocation; middleware verifies signature, issuer, audience, expiry, session and current role. No JWT is returned to JavaScript or saved in localStorage.
- Signed CSRF cookies and request headers protect mutations, including login/logout; configured origins are checked. API responses use `Cache-Control: no-store`. Production frontend must use its same-origin `/api` proxy.
- Health endpoints separate liveness (`/health/live`) from database readiness (`/health/ready`).

The transaction design uses existing bookings rather than introducing a separate seat-inventory collection, avoiding a second source of truth and an inventory backfill. A heavily used restaurant can become a write bottleneck; measure before choosing finer-grained locking. HttpOnly prevents direct token reads but does not eliminate XSS-driven actions; output handling, dependencies and CSP still matter.

## Browser and data evidence

Chrome against disposable local services successfully signed in, booked two seats, and displayed the saved booking contact. Reload restored the signed-in user and reservation. The restaurant then displayed six remaining seats from its original capacity of eight. Cancellation reached a confirmation dialog, but browser control was interrupted before its result could be verified; cancellation is covered by API and frontend tests but is not marked browser-verified here. This is local smoke evidence, not a hosted deployment smoke test.

The [read-only Atlas audit](evidence/evaluation/database-summary.json) found 11 users, 10 restaurants and 5 bookings (2 confirmed, 3 cancelled). Stored booking creation timestamps span 10–28 August 2026. No confirmed slot exceeded its restaurant's current capacity. These records have not been established as genuine pilot activity; they must not be reported as 11 pilot participants.

The [synthetic benchmark](evidence/evaluation/local-benchmark.json) uses 100 restaurants and 1,000 bookings. API availability matched an independent database aggregation for 200/200 slots. Across 2,400 measured HTTP requests at concurrency 1/5/10/20, all responses succeeded. Each level has three short 200-request runs following 20 warm-up requests. It is not the planned five-minute staging test. Run-level p95 ranged from 18.50 to 302.93 ms; raw p50/p95/p99 and throughput are preserved. Shared-laptop load, short duration, fixed request mix and a local database limit generalization.

## Reproduce

From `server`: `npm ci`, `npm run test:coverage`, `node scripts/benchmark.mjs`.
From `client`: `npm ci`, `npm run lint`, `npm run build`, `npm run test:coverage`.
The benchmark requires the server build produced by the API test command. `node scripts/audit-data.mjs` is an optional read-only aggregate audit of the database selected by local `.env`; it exports no personal fields or connection string.

## Remaining work

Complete Render deployment, connect the Vercel same-origin API proxy, and verify production cookie forwarding and all live journeys. Record deployment revisions and URLs. Run a longer staging experiment and establish real-data provenance. Integrate the literature review and evidence into the authoritative report, then export and visually verify it.

Current deployment handoff: Render's free-service form targets `codex/lecturer-improvements`, root `server`, build `npm ci --include=dev && npm run build`, start `npm start`, health `/health/ready`. A strong session secret is entered. Refreshing the repository branch list reset the earlier environment import, so the open import dialog still needs the approved local `.env.render-upload` file. Vercel is waiting for the account's authenticator code. Neither new deployment is claimed live. Do not commit the ignored import files; remove them after successful configuration.

Dependency audit at implementation time: frontend 0 vulnerabilities; server production dependencies 0. The server's full developer dependency tree reported 19 moderate advisories through Jest's transitive dependencies. An incompatible automatic downgrade was not applied.
