---
phase: 01-foundation-and-security
plan: 03
subsystem: database
tags: [supabase, filtering, data-quality, constants, dashboard, call-explorer]

# Dependency graph
requires:
  - phase: 01-01
    provides: getCalls() and getDashboardData() wired to live Supabase DB
provides:
  - Shared MIN_CALL_DURATION_SECONDS = 25 constant (single source of truth)
  - getCalls() excludes calls <= 25s (Call Explorer clean)
  - All five getDashboardData() sub-queries exclude calls <= 25s (KPIs, charts, recent calls clean)
  - DASH-06 (short-call noise) resolved
  - DASH-07 (No Digit robocalls) resolved via documented duration proxy
affects:
  - All future phases that read from calls table
  - Phase 3 (Trends) — volume charts inherit the filter automatically

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-constant pattern: data-quality thresholds defined once in constants.ts, imported everywhere"
    - "Supabase .gt() filter excludes both below-threshold AND null duration rows (Postgres semantics)"

key-files:
  created:
    - src/lib/data/constants.ts
  modified:
    - src/lib/data/calls.ts
    - src/lib/data/dashboard.ts

key-decisions:
  - "DASH-07 Approach A (duration proxy): no release_cause column exists in DB; 16-25s cluster is No Digit noise; true field deferred to v3"
  - "Threshold = 25 seconds: data shows 76/168 calls (45%) in 16-25s range, characteristic of IVR No Digit hangups"
  - "Used .gt() not .gte(): calls of exactly 25s are also excluded (boundary inclusive to threshold)"

patterns-established:
  - "constants.ts: shared data-quality thresholds live in src/lib/data/constants.ts, not inline magic numbers"

# Metrics
duration: 2min
completed: 2026-06-03
---

# Phase 1 Plan 03: Call Noise Filtering (DASH-06 + DASH-07) Summary

**Single MIN_CALL_DURATION_SECONDS = 25 constant now excludes sub-threshold calls (45% of DB was noise) from Call Explorer, all dashboard KPIs, charts, and recent-calls list**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-03T23:29:01Z
- **Completed:** 2026-06-03T23:31:31Z
- **Tasks:** 3 (1 investigation, 2 code)
- **Files modified:** 3 (1 created)

## Accomplishments

- Confirmed via live DB query that no `release_cause` column exists — DASH-07 must use duration proxy
- Created `src/lib/data/constants.ts` with documented threshold and DASH-07 rationale
- Applied `.gt('duration_seconds', MIN_CALL_DURATION_SECONDS)` to `getCalls()` (Call Explorer)
- Applied the same filter to all five sub-queries in `getDashboardData()` (yesterday, week, month, volume chart, recent calls)

## Task Commits

Each task was committed atomically:

1. **Task 1: Decide DASH-07 approach from live DB state** — investigation only, no commit (no files changed)
2. **Task 2: Add shared threshold constant and filter getCalls()** — `8577c3b` (feat)
3. **Task 3: Apply the same filter to all dashboard sub-queries** — `59145f3` (feat)

## Files Created/Modified

- `src/lib/data/constants.ts` — Exports `MIN_CALL_DURATION_SECONDS = 25`; includes full DASH-06/DASH-07 documentation and DB evidence
- `src/lib/data/calls.ts` — Added import + `.gt('duration_seconds', MIN_CALL_DURATION_SECONDS)` to getCalls() query
- `src/lib/data/dashboard.ts` — Added import + `.gt('duration_seconds', MIN_CALL_DURATION_SECONDS)` to all five calls-table sub-queries

## Decisions Made

**DASH-07: Approach A — Duration proxy**

Live DB query against `jdoatvotmsmhrmpitzon` on 2026-06-03 showed:
- No columns matching `%release%`, `%cause%`, `%disposition%`, or `%digit%` in the `calls` table
- Duration distribution: 76 of 168 calls (45%) fall in the 16–25 second range
- That cluster is characteristic of IVR "No Digit" immediate hangups
- True `release_cause` field would require n8n HTML re-parse + schema migration + full re-ingest — deferred to v3

**Threshold = 25 seconds**

The plan suggested 25s. DB evidence confirmed this is the natural break point: the 16-25s cluster is noise; calls at 31s+ are the first real calls. Threshold of 25 excludes the entire noise band while preserving all genuine calls.

## Deviations from Plan

None — plan executed exactly as written. DB investigation confirmed Approach A as expected (no release_cause column found). Threshold value of 25s was confirmed correct by the data.

## Issues Encountered

None. Build passed clean on first attempt.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- DASH-06 and DASH-07 are fully resolved. All future phases that query `calls` will inherit noise-free data by default.
- Phase 1 is now complete (all 3 plans done: 01-01 data fix, 01-02 security, 01-03 filtering).
- Ready to begin Phase 2.

---
*Phase: 01-foundation-and-security*
*Completed: 2026-06-03*
