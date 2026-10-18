# Tasks 4 and 5 verification plan

Target: GitHub main e60f030 and the currently deployed Vercel/Render/Atlas system.

1. Preserve the user's original checkout; use this isolated current-main checkout.
2. Execute owner submission, admin approval, public discovery, owner profile editing,
   booking management, suspension/reapproval, and final suspension using a clearly
   labelled QA fixture. Leave unrelated restaurant states unchanged.
3. Record browser evidence and expected/actual outcomes. Keep synthetic account,
   restaurant and booking IDs separate from operational-data measurements.
4. Audit Atlas using read-only queries and export anonymized aggregates only.
   Independently compare hosted availability with confirmed-booking guest totals.
   Historical dates rejected by the API must be reported separately.
5. Run a read-only, paced hosted workload: concurrency 1/3/5, five minutes each,
   bounded at five requests/second overall, with timeout and failure-stop guards.
   Preserve per-request timing/status metadata without response bodies or contacts.
6. Publish p50/p95/p99, achieved throughput, errors, dataset counts, exclusions,
   environment and reproduction commands in a verification supplement.
7. Verify the final fixture is hidden and test bookings do not consume seats.

Evidence boundary: the user cannot establish which existing Atlas records are
genuine customer activity. Label provenance unknown; do not invent a pilot,
participants, collection period, or adoption findings. Hosted database records
and synthetic QA fixtures are different evidence categories.

## Execution result

The recorded owner/admin smoke gap is closed (17 checks). Capacity comparisons
matched 110/110 operational slots and 20/20 separate QA slots. Accepted hosted
phases contain 2,633 requests and zero errors; the interrupted attempt remains
preserved and excluded with an explanation. See VERIFICATION_RESULTS_2026-10-18.md
and the four-page PDF in output/pdf for the final measurements and limits.

Tooling validation: all four new JavaScript files passed node --check; invalid
duration and overwrite guards rejected their negative checks; the report builder
rejected the interrupted result before assembling accepted phases. The assembler
then independently checked sample counts and percentiles, and report evidence
checks passed. All four rendered PDF pages were visually reviewed.

The remaining empirical gap is genuine-customer provenance. Exact seed-identity
matches account for three of five older bookings. No claim of a genuine pilot is
made, and no existing source-file changes in the user's original checkout were
overwritten.
