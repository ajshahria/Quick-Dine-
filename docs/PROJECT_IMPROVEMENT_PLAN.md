# QuickDine: lecturer task implementation plan

Prepared: 15 October 2026

Status: planning only. This document does not claim that fixes, tests, deployments, or measurements have been completed.

## 1. Objective and submission package

Resolve the five lecturer requirements through working code, reproducible verification, a live deployment, and an evidence-based report. Keep each requirement traceable to its implementation, test cases, and report evidence.

| Lecturer requirement | Planned deliverable | Completion evidence |
| --- | --- | --- |
| Complete backend functionality | Cuisine filtering, booking validation, saved contact snapshot | API tests and database round-trip checks |
| Automated testing | Jest + Supertest API suite; React Testing Library frontend suite | Test totals, pass rate, coverage reports, CI run |
| Secure authentication | Cookie-based authentication and server verification | Cookie flags, negative authentication and CSRF tests, browser checks |
| Validated deployment | Vercel frontend, Render API, Atlas database | Working URLs and timestamped end-to-end smoke-test record |
| Results and academic depth | Dataset description, capacity/load evaluation, literature review, expanded future work | Raw measurements, tables, citations, revised report |

## 2. What the current source shows

- `server/controllers/restaurantController.ts`: restaurant listing handles search, price, rating, location, and sorting, but does not consume a cuisine query parameter. Extend the existing GET `/api/restaurants` endpoint rather than creating a duplicate listing endpoint.
- `server/controllers/bookingController.ts`: checks required values, restaurant approval, and remaining seats, but lacks complete date, allowed-slot, and integer guest-count validation. Capacity is read and booking insertion happens separately, creating a concurrency risk.
- `server/models/Booking.ts`: stores occasion and special requests but has no booking-specific contact fields.
- `client/src/pages/BookingConfirmation.tsx`: contains editable name, email, and phone fields; these need to be connected to the booking payload and persisted.
- `client/src/context/AppContext.tsx` and `client/src/lib/api.ts`: persist/read the JWT in localStorage and attach a Bearer header.
- `server/middlewares/auth.ts`: already verifies JWTs and loads user roles. Update this mechanism to consume cookies; do not describe server verification as entirely absent.
- `server/controllers/restaurantController.ts`: also performs separate Bearer verification for restricted restaurant details. Include this path in the authentication migration.
- Both package manifests currently lack test scripts. `server/server.ts` combines app assembly, database connection handling, and listening; separate these for integration testing.
- The client has an existing Vercel API fallback URL. Its availability was not checked during planning, and it must be replaced/configured for the requested Render deployment.
- `tmp/pdfs/build_report.py` already lists nine future-work items. The lecturer's version may differ: compare the submitted PDF/DOCX with this source before editing. Expand depth and prioritization rather than simply adding items to reach four.
- Existing `output/` and `tmp/` files are untracked. Preserve them and identify the authoritative report source before regenerating artifacts.

## 3. Order of work

Baseline and business rules -> test harness -> backend fixes with regression tests -> cookie migration with security tests -> complete frontend tests and CI -> staging deployment -> smoke tests -> quantitative evaluation -> report revision -> final verification.

Start literature discovery and evidence logging alongside implementation. Final measurements must describe the final tested version, not an earlier build.

## 4. Phase A: baseline and decisions

1. Record Git revision, dependency lockfiles, Node version, build/lint outcomes, and current endpoint behavior. Preserve existing user changes.
2. Create a requirement-to-test checklist and an evidence directory. Record failures honestly rather than treating the baseline as passing.
3. Establish booking rules: restaurant timezone (initial proposal: Asia/Dhaka), canonical `YYYY-MM-DD` dates, allowed slot format, booking horizon, required contact fields, and maximum party size. Document the chosen rules before coding.
4. Define date-only storage consistently so availability and booking creation use the same restaurant/date/slot key. Reject invalid calendar dates and elapsed same-day slots.
5. Identify credentials/accounts needed later: repository access, Vercel, Render, Atlas, existing image-upload configuration, and optional custom domain. Keep secrets out of source and report artifacts.

Exit: reproducible baseline and documented API/business rules.

## 5. Phase B: complete backend functionality

### B1. Cuisine filtering

- Add a validated `cuisine` query parameter to GET `/api/restaurants`, implemented in `restaurantController.ts` and exposed through the existing `restaurantRoutes.ts` route.
- Use the current restaurant cuisine representation; define normalization, case handling, and single/multiple-selection semantics to match the frontend.
- Keep approved-only visibility and combine cuisine with existing filters and sorting. Reject malformed query shapes; avoid treating arbitrary input as executable regular-expression syntax.
- Wire the restaurant-listing UI to this parameter and show clear empty/loading/error states.
- Test matching and nonmatching cuisines, combined filters, empty results, malformed values, and exclusion of pending/rejected restaurants.

### B2. Booking validation and capacity consistency

- Add shared server validation for booking creation and availability lookup. Validate restaurant identifiers, strict calendar dates, future slot eligibility, configured slots, and a finite positive integer guest count within the documented limit.
- Preserve restaurant approval checks. Return consistent client errors: malformed input 400, missing resource 404, and insufficient/conflicting capacity 409 as the proposed contract.
- Expected available seats = max(0, configured capacity - sum of confirmed guests for the same restaurant/date/slot). Cancelled and completed bookings do not contribute under the existing confirmed-only policy.
- Handle invalid/missing capacity explicitly rather than silently relying on an undocumented fallback.
- Prevent simultaneous overbooking with a database-level atomic reservation design. Proposed approach: one uniquely indexed inventory record per restaurant/date/slot, conditional capacity update, and booking creation in the same MongoDB transaction.
- A transaction around an unchanged read-then-insert sequence alone is insufficient: competing reservations must contend on shared inventory. Use a replica-set-capable test database for transaction tests.
- Update cancellation, owner status changes, and capacity edits consistently. Make repeated cancellation/status requests idempotent so seats are not released twice. Specify allowed status transitions and prevent capacity reductions below existing allocations.

### B3. Booking contact snapshot

- Add a nested booking contact snapshot containing name, email, and phone to `Booking.ts`, with requiredness and length/format rules agreed in Phase A.
- Send edited values from `BookingConfirmation.tsx`; validate and normalize them in `bookingController.ts` before saving.
- Return the saved snapshot to the diner and authorized restaurant owner. Do not expose contacts on public restaurant endpoints or include them in load-test logs.
- Keep this independent of the user's account profile: later profile edits must not rewrite historical booking contacts.
- For older bookings, label missing contacts as unavailable; do not invent historical values. Test both old and new records.

Exit: all three missing functions work through the API and UI, including invalid inputs and competing requests.

## 6. Phase C: automated tests and published results

Build the test harness before Phase B changes, then add regression tests alongside each fix.

### Backend: Jest + Supertest

- Extract an importable Express app into a proposed `server/app.ts`; keep startup/listening in `server/server.ts`. Make database lifecycle controllable in tests.
- Configure Jest for the repository's TypeScript/ESM setup, checking package compatibility before installation. Use an isolated MongoDB test database; use a disposable replica set for transaction tests. Never reset the deployment database from a test suite.
- Use Supertest agents for cookie persistence and deterministic fixtures for diner, owner, admin, restaurants, dates, and bookings. Mock external image services, not the database behavior being evaluated.

| Area | Required scenarios |
| --- | --- |
| Authentication | Register, login, wrong password, duplicate email, current user, logout, missing/expired/tampered cookie, deleted user, role escalation prevention |
| Capacity | Empty slot, exact fill, overcapacity, isolation by date/slot/restaurant, cancelled/completed exclusion, concurrent requests, repeated cancellation, owner status changes |
| Approval lifecycle | Owner creates pending listing, pending hidden publicly, admin approval exposes listing, rejection hides listing, non-admin denied, cross-owner access denied, invalid transitions |
| Filtering and validation | Cuisine combinations, invalid query shapes, invalid/past dates, unknown or elapsed slots, zero/negative/fractional/non-numeric guests |
| Contact persistence | Edited values survive save/reload, historical snapshot stable, legacy missing fields handled, unauthorized access denied |
| Cookie security | Correct flags and expiry, no token in JSON, logout clears matching cookie, CSRF/origin rejection, restricted restaurant-detail authentication |

Inspect the existing admin and owner controllers before defining rejection/status-transition behavior; do not assume every transition is already supported.

### Frontend: React Testing Library

- Use React Testing Library, user-event, jest-dom, and a compatible runner (proposed: Vitest for this Vite client); the backend remains Jest as required. If the lecturer requires Jest for both, configure Jest for the client instead.
- Test observable behavior: cuisine filtering, booking validation feedback, availability loading/failure/full slots, edited contact submission, confirmation, authentication restoration, logout, and role-sensitive views.
- Mock HTTP responses at the network boundary. Include 401, 409, and server-error responses. Use accessible labels and realistic user interactions.
- Component tests do not prove real browser cookie behavior; add live browser smoke checks in Phase E.

### Reporting and quality gates

- Add proposed scripts `test`, `test:coverage`, and a CI workflow for both packages. Run builds and client lint in CI too.
- Proposed coverage gates: at least 80% statements/lines/functions and 75% branches for application code, with explicit critical-path cases above. These are targets, not current results.
- Include untested application files in coverage; exclude generated `dist`, dependencies, and test code. Explain any other exclusion.
- Publish HTML/LCOV/JSON coverage artifacts and machine-readable test results through CI, plus a concise report table linked to the commit/run.
- Report passed, failed, skipped, and total tests separately. Executed pass rate = passed / (passed + failed) x 100; also show skipped/total so a small passing subset is not misleading. If none ran, report N/A.
- Require zero failing tests and no skipped critical-path tests. Coverage indicates exercised code, not proof of correctness.

Exit: repeatable test runs, meaningful critical-path checks, and archived actual results.

## 7. Phase D: replace browser token storage

1. Choose a short-lived JWT in a host-only HttpOnly cookie as the initial scope. Configure Secure in production, SameSite=Lax for the proposed same-origin deployment, explicit lifetime, and Path. Require reauthentication on expiry; refresh rotation is an optional extension, not a hidden dependency.
2. Update `authController.ts` to set cookies on registration/login and add logout that clears the same cookie attributes. Return user information without JWT JSON fields.
3. Update `auth.ts` and restricted restaurant-detail access to use a shared cookie-verification helper. Continue loading the current user and role from MongoDB.
4. Update `AppContext.tsx` to restore the session through `/api/auth/me`; remove token state/localStorage writes and clean up legacy stored tokens. Update `lib/api.ts` to send credentials and remove Bearer injection. Audit all other token consumers.
5. Add CSRF protection for state-changing requests (including login/logout), backed by origin checks and an appropriate CSRF-token mechanism. Configure exact allowed origins if cross-origin access is enabled; do not combine credentialed requests with wildcard CORS.
6. Validate logout and expiry behavior. Cookie clearing ends that browser session but does not revoke a copied JWT; document this residual risk or introduce a server-side session version/revocation mechanism if immediate revocation is required.
7. Retain XSS prevention through safe rendering and appropriate security headers. HttpOnly reduces token theft through JavaScript; it does not eliminate XSS or stop all authenticated actions by injected scripts.

Deployment decision: prefer browser requests to the Vercel site's `/api` path, proxied to Render. Verify forwarding of Set-Cookie and Cookie headers, disable caching of authenticated responses, and avoid a cookie Domain tied to Render. Direct requests from a Vercel domain to an unrelated Render domain are cross-site: Lax cookies will not support this flow. Such a design needs SameSite=None; Secure, CSRF controls, and testing against third-party-cookie restrictions, or a same-site custom-domain arrangement.

Exit: full authentication flow works without JavaScript-readable JWT storage and with negative security cases covered.

## 8. Phase E: deploy and validate

1. Atlas: provision the application database, restricted database user, network access appropriate to the backend, and required indexes. Separate test/staging data from genuine records.
2. Render: deploy the `server` directory, choose a supported Node version, install locked dependencies, compile TypeScript, and start the verified compiled entrypoint. Honor Render's PORT. Configure MongoDB URI, JWT secret, frontend origin, and required image-service secrets through platform settings.
3. Add distinct liveness and database-readiness endpoints. The current root message alone does not demonstrate database readiness.
4. Vercel: deploy `client`, verify its production build/output directory, configure the API proxy before the SPA fallback, and replace the old API fallback configuration. Test direct navigation to React routes.
5. Validate production cookie behavior and authenticated-response caching through the actual HTTPS deployment.
6. Record deployment IDs, commit, date/time with timezone, configuration names without secret values, frontend URL, direct backend URL, and readiness URL.

Smoke-test checklist:

- Frontend loads over HTTPS; nested-route refresh works; restaurant listing is retrieved from the deployed database.
- Direct backend liveness and readiness pass; proxied API works.
- Register/login, refresh session, and logout work in a real browser; cookie flags are correct and no JWT remains in localStorage.
- Owner creates a pending listing; diner cannot see/book it; admin approves; it becomes visible and bookable.
- Cuisine filter returns the expected listing.
- Submit a booking with edited contact details; verify its reference, persisted contact snapshot, and reduced seat count after reload.
- Reject invalid requests and excess capacity; cancel once and verify restored capacity.
- Verify unauthorized owner/admin actions are rejected; inspect frontend console and backend logs for unexpected errors.

Record expected result, actual result, pass/fail, timestamp, and sanitized evidence for each step. Replace report/README LINK placeholders only after verifying real URLs. Do not present the existing hardcoded URL as verified deployment evidence.

Exit: working URLs and a documented complete user journey, not just HTTP 200 responses.

## 9. Phase F: quantitative evaluation

### Data collection

- Collect consented pilot usage with real restaurants/users where available. Count distinct users, restaurants by approval state, and bookings by status over a stated period; distinguish owners/admins from diners and unique people from registered accounts.
- Anonymize exported records and record provenance, collection dates, exclusions, and dataset version. Do not publish names, contact fields, tokens, or credentials.
- Use separately labelled seeded/synthetic fixtures for controlled edge cases and load generation. If real data is unavailable, report that limitation explicitly; synthetic traffic is not evidence of real adoption and does not fully satisfy the real-data requirement.

### Capacity correctness

- Independently calculate expected remaining capacity from confirmed records for each restaurant/date/slot and compare it with the API result.
- Report cases checked, exact matches, mismatches, and accuracy = exact matches / cases checked x 100. With zero cases, report N/A.
- Include full, empty, partially occupied, cancelled, and cross-date cases. For concurrency tests, check persisted records as well as response codes: confirmed guests must never exceed capacity, and inventory must reconcile with bookings.
- Use fixed fixtures/frozen time for repeatability and a separate anonymized real-data audit for the lecturer's requirement.

### Performance experiment

- Use a reproducible HTTP load tool such as k6 after confirming runtime compatibility. Test an isolated staging environment with representative dataset size and indexes.
- Proposed protocol: 1-minute warm-up, then 5-minute measured runs at 1, 5, 10, and 20 virtual users; repeat each level three times. Adjust downward if the hosting tier cannot safely support it and report the adjustment.
- Measure listing/filtering, availability, and authenticated booking separately, plus a documented mixed workload. Ensure booking tests provision enough inventory; distinguish expected capacity conflicts from unexpected failures.
- Record p50/p95/p99 latency, throughput, unexpected error rate, request count, concurrency, run duration, dataset size, host tier/region, load-generator location, commit, and cold-start conditions. Separate cold-start observations from warmed measurements.
- Proposed warm-run target: p95 below 1 second and unexpected errors below 1% at 10 virtual users. Capacity correctness target: 100% on the defined cases and zero overbooking. These are evaluation criteria to agree before running, never claimed results.
- Keep raw exports and scripts. Report failed targets and variation between runs; do not extrapolate a small pilot into production-scale claims.

Exit: auditable dataset counts, measured results, and honest interpretation of limits.

## 10. Phase G: literature review and final report

### Literature method

- Search scholarly sources for restaurant reservation systems, online table booking, capacity/concurrency management, usability, and secure web sessions.
- Select approximately 8-12 relevant sources as a proposed target, including peer-reviewed studies and foundational work. Use official technical documentation to support implementation choices, not as a replacement for academic literature.
- Verify authors, year, title, publication venue, and DOI/URL. Read the sources before citing them; retain search terms and selection criteria.
- Build a comparison table: source/year, problem, method, evaluated dataset, results, limitations, and relevance to QuickDine. Distinguish product documentation from peer-reviewed evaluations.
- Synthesize the gap QuickDine addresses without claiming novelty unsupported by the comparison. Apply the lecturer's citation format consistently.

### Proposed report structure

1. Abstract and measurable objectives.
2. Introduction, problem statement, and scope.
3. Literature review and comparison with related systems.
4. Requirements and use cases for diner, owner, and administrator.
5. Architecture, database design, API flow, and booking rules.
6. Implementation: cuisine filtering, contact snapshot, validation, atomic capacity, cookie authentication.
7. Testing methodology, test matrix, pass rates, coverage, and CI evidence.
8. Deployment architecture, verified URLs, and smoke-test results.
9. Dataset, experimental method, capacity correctness, performance tables/charts, and interpretation.
10. Remaining limitations and threats to validity, including pilot size, artificial load, hosting effects, and security scope.
11. Prioritized future work and conclusion.
12. References and appendices linking reproducible evidence.

Develop at least six future-work topics with benefit, scope, and priority: verified reviews; email/SMS notifications; waitlists; no-show/deposit management; table-level allocation; recommendations/maps; accessibility/usability research; and monitoring/backup recovery. Completed lecturer requirements belong in implementation/results, not future work.

Update the authoritative report source, export the required PDF/DOCX, and visually inspect every page for clipped content, broken tables, references, and working links. Improve depth through evidence rather than targeting an arbitrary page count.

## 11. Suggested schedule and dependencies

Planning estimate for one developer: approximately 15 working days, plus time for real pilot data collection, account access, or lecturer feedback.

| Days | Work |
| --- | --- |
| 1-2 | Baseline, business rules, test harness, literature search |
| 3-5 | Cuisine, validation, contact persistence, atomic capacity, regression tests |
| 6-7 | Cookie authentication, CSRF controls, frontend integration |
| 8-9 | Complete API/frontend tests, CI, coverage gaps |
| 10-11 | Deploy and complete browser/API smoke tests |
| 12-13 | Capacity audit and repeated load experiments; analyze pilot data |
| 14-15 | Report revision, references, artifact verification, final demonstration |

Real-data collection should begin as soon as a stable pilot is available and may extend beyond this estimate. A passing local build does not unblock reporting deployment as successful; a verified live flow is required.

## 12. Evidence organization and final acceptance

Proposed future evidence layout:

```text
docs/evidence/
  baseline/
  tests/          # CI run details, test totals, coverage links
  deployment/     # verified URLs and smoke-test log
  evaluation/     # dataset summary, raw load output, result tables
  literature/     # verified source matrix and search notes
```

Final acceptance checklist:

- [ ] All five lecturer tasks mapped to implemented changes and evidence.
- [ ] Missing backend functionality completed and invalid input rejected server-side.
- [ ] No overbooking in defined concurrency cases; cancellation/status transitions reconcile.
- [ ] Cookie authentication works through the deployed frontend; no localStorage JWT.
- [ ] API and frontend suites pass; actual coverage and pass rates published.
- [ ] Vercel, Render, and Atlas integration demonstrated; report URLs verified.
- [ ] Real-data counts and repeatable metrics reported with clearly labelled synthetic tests.
- [ ] Literature review contains verified citations and comparison/synthesis.
- [ ] Expanded future work is distinct from completed work.
- [ ] Final report artifacts visually checked; no unsupported success claims or remaining LINK placeholders.

## Technical references checked during planning

- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Vercel rewrites: https://vercel.com/docs/routing/rewrites
- Render Express deployment: https://render.com/docs/deploy-node-express-app

These support the proposed security/deployment approach. The academic literature review and experimental results remain work to be performed.
