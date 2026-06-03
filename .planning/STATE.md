# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-03)

**Core value:** Karen and Garret can understand what's happening on every call without listening to recordings
**Current focus:** Phase 2 — next phase (Phase 1 complete)

## Current Position

Phase: 1 of 5 complete (Foundation & Security) — ready for Phase 2
Plan: 03 of 03 in phase (all complete)
Status: Phase 1 complete
Last activity: 2026-06-03 — Completed 01-03-PLAN.md (DASH-06 + DASH-07 noise filtering)

Progress: [████░░░░░░] ~20%

Phases: 1/5 complete | Plans: 4 complete (01-research + 01-02 security + 01-01 data fix + 01-03 filtering)

## Performance Metrics

**Velocity:**
- Total plans completed: 3 execution plans (01-01, 01-02, 01-03)
- Average duration: ~4 min
- Total execution time: ~12 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-security | 3/3 complete | ~12 min | ~4 min |

*Updated after each plan completion*

## Accumulated Context

### Key Decisions This Milestone

- Auth deferred to v3 — dashboard URL not shared publicly
- Prompt/scoring editor in Settings deferred to v3
- DASH-06/DASH-07 placed in Phase 1 (data quality affects all views, not just dashboard)
- TRENDS split into its own phase (Phase 4) — substantial build, 4 charts + filters
- **SEC-01 (01-02):** Deleted `/api/audit/run` and `/api/audit/call-count` routes entirely (Option A) vs adding INGEST_SECRET auth — no external callers existed after modal was rewired to server actions
- **SEC-02 (01-02):** n8n credential exposure risk accepted for v2; formal doc in docs/security-notes.md; revisit in v3
- **DATA-01 (01-01):** Root cause = H2 (Supabase one-to-one FK joins return objects not arrays). 105 metadata_saved calls are intentional (no recording). Fix: Array.isArray() guard in getCalls() and getCallDetail()
- **DASH-07 (01-03):** Approach A (duration proxy) — no `release_cause` column in DB (confirmed 2026-06-03). 76/168 calls (45%) in 16-25s range = No Digit noise. True field deferred to v3.
- **DASH-06 threshold (01-03):** MIN_CALL_DURATION_SECONDS = 25. Single constant in src/lib/data/constants.ts imported by both calls.ts and dashboard.ts.

### Active Concerns

- DB types are stubs (110+ cast sites) — not in v2 scope but raises refactor risk
- Agent-to-call linkage is fuzzy AI name match — audit accuracy risk, not addressed in v2

### Resolved Concerns

- ~~DATA-01: Call Explorer shows no data~~ — Resolved in 01-01: Supabase one-to-one FK joins return objects not arrays; getCalls() and getCallDetail() fixed with Array.isArray() guard
- ~~`/api/audit/run` and `/api/audit/call-count` have no auth guards~~ — Resolved in 01-02: routes deleted, logic moved to server actions
- ~~DASH-06: Short call noise in all views~~ — Resolved in 01-03: MIN_CALL_DURATION_SECONDS = 25 applied to getCalls() and all 5 getDashboardData() sub-queries
- ~~DASH-07: No Digit robocalls in all views~~ — Resolved in 01-03: Covered by duration proxy (no release_cause column exists); deferred true field to v3

### Pending Todos

None.

## Session Continuity

Last session: 2026-06-03T23:31:31Z
Stopped at: Completed 01-03-PLAN.md. Phase 1 fully complete. Ready for Phase 2.
Resume file: None
