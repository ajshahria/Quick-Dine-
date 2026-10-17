# Literature review and research context

Prepared 17 October 2026 for integration into the QuickDine report. This is a focused narrative review, not a systematic review or a claim to have benchmarked competing commercial systems. Research-paper summaries below are limited to the verified publisher/repository abstracts; implementation guidance is identified separately.

## Restaurant capacity and operational evidence

Kimes, Chase, Choi, Lee and Ngonzi (1998) relate restaurant revenue management to how long diners occupy tables. This establishes a useful distinction for QuickDine: counting seats in a named slot is only a simplified capacity model. A reservation system also needs a defensible treatment of dining duration before it can claim to prevent overlap between adjacent slots. QuickDine currently assumes configured slots are independent; it does not assign physical tables or model variable meal durations. [Restaurant Revenue Management: Applying Yield Management to the Restaurant Industry](https://ecommons.cornell.edu/entities/publication/1c996dfd-35f2-46d4-9a50-880c145f02a8).

Kimes, Barrash and Alexander (1999) describe working with a restaurant to test recommendations and track results. Their empirical setting highlights an evidence gap in this project: successful software tests cannot demonstrate business benefit or customer adoption. QuickDine's existing database counts and synthetic experiments therefore need to be supplemented by a consented pilot with a recorded observation period, clearly identified genuine activity and operational feedback. [Developing a Restaurant Revenue-management Strategy](https://ecommons.cornell.edu/entities/publication/897385c1-31d1-4c47-a731-22e1e7935e17).

## Transaction isolation and booking correctness

Berenson, Bernstein, Gray, Melton, O'Neil and O'Neil (1995) show that familiar isolation terminology does not fully characterize database behavior and introduce a clearer treatment of snapshot isolation. For QuickDine, the design implication is that wrapping a read-count-then-insert sequence in a transaction is not, by itself, a sufficient explanation of capacity safety. The report must identify the competing operations and the shared write that forces conflicting reservations to retry. This is an application-specific inference, not an algorithm proposed by that paper. [A Critique of ANSI SQL Isolation Levels](https://www.microsoft.com/en-us/research/publication/a-critique-of-ansi-sql-isolation-levels/).

MongoDB's technical documentation explicitly discusses stale transaction reads and using a modifying `findOneAndUpdate` operation to acquire a write lock on a document. QuickDine applies this guidance through a restaurant revision increment before calculating confirmed allocations. Booking creation, cancellation, completion and capacity-affecting owner edits participate in the same protocol. This protects the invariant only while every relevant writer follows that protocol; direct database edits can bypass it. The restaurant-wide lock trades simplicity for contention under concentrated demand. [MongoDB transaction production considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).

## Authentication and browser security

OWASP's HTML5 guidance warns against keeping session identifiers in browser local storage because JavaScript can read them. QuickDine removes that storage path and sends the JWT in an HttpOnly cookie. This specifically reduces direct token theft through script access; it does not establish that the application is immune to XSS. [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).

OWASP's session-management guidance treats session handling as a lifecycle spanning issuance, transport and termination. QuickDine consequently combines production Secure cookies and a one-hour token expiry with a database session record that logout can revoke. Role checks use the current user record rather than treating a stale client claim as authoritative. These controls must also be checked across the deployed reverse proxy. [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Cookie authentication also requires a separate CSRF analysis because browsers attach cookies automatically. OWASP describes token/header-based defenses and origin checks. QuickDine uses a signed cookie/header token check, configured origin checks and SameSite=Lax cookies with a same-origin frontend proxy. Tests include rejected missing or invalid CSRF headers; deployment testing must establish that the proxy preserves the intended cookie behavior. [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## User-facing verification

Testing Library recommends tests that resemble how people use the interface. QuickDine's frontend suite therefore operates through labeled controls, submits forms and checks visible outcomes while mocking the network boundary. The API suite uses a real temporary replica set to test persistence and transactions. Neither layer replaces a browser test against the hosted frontend and backend: transport, cookies, deployment configuration and database connectivity introduce additional failure modes. [Testing Library guiding principles](https://testing-library.com/docs/guiding-principles/).

## Comparison and supported contribution

| Source area | What it contributes | QuickDine application | Evidence still needed |
|---|---|---|---|
| Restaurant revenue-management research | Capacity must be considered over time and validated operationally | Explicit slot/seat model and documented limits | Dining-duration model and genuine restaurant pilot |
| Isolation research and MongoDB guidance | State invariants need a concrete concurrency protocol | Shared transactional restaurant write and concurrent API tests | Sustained hot-restaurant contention experiment |
| OWASP guidance | Browser token storage, session lifecycle and CSRF are distinct concerns | HttpOnly session cookie, revocation and CSRF verification | Hosted proxy/cookie smoke tests and broader security review |
| Testing Library guidance | Tests should reflect user interactions | Form, filter, authentication and role journeys | Accessibility review and usability study with participants |

The supported contribution is an implemented and tested integration for this project, not a new transaction algorithm or demonstrated improvement over commercial reservation platforms. The measured local results and their limits are recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Prioritized future improvements

1. Model reservation durations and physical table combinations to detect cross-slot overlap.
2. Run a consented restaurant pilot, recording genuine-user provenance, task completion and operational feedback.
3. Add account verification, password recovery and stronger protection for administrator accounts.
4. Add booking idempotency keys to prevent duplicate reservations after uncertain network retries.
5. Introduce a waitlist and cancellation notifications with explicit communication preferences.
6. Add structured observability, alerting and tested database backup/restore procedures.
7. Evaluate per-slot contention control and pagination after representative load measurements identify bottlenecks.
8. Audit keyboard/screen-reader accessibility and test layouts with diverse devices and users.

Each improvement needs its own acceptance criteria and evaluation. None is presented as already implemented.
