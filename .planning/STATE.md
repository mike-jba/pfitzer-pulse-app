# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-03)

**Core value:** Karen and Garret can understand what's happening on every call without listening to recordings
**Current focus:** Phase 3 — next phase (Phase 2 complete)

## Current Position

Phase: 3 of 5 (Dashboard & Recaps Polish) — in progress
Plan: 02 of N in phase complete
Status: In progress — 03-02 complete, 03-01 pending (has checkpoint)
Last activity: 2026-06-04 — Completed 03-02-PLAN.md (Dashboard Pending Badges)

Progress: [███████░░░] ~35%

Phases: 2/5 complete | Plans: 7 complete (01-research + 01-02 security + 01-01 data fix + 01-03 filtering + 02-01 brand tokens + 02-02 spacing pass + 03-02 pending badges)

## Performance Metrics

**Velocity:**
- Total plans completed: 3 execution plans (01-01, 01-02, 01-03)
- Average duration: ~4 min
- Total execution time: ~12 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-security | 3/3 complete | ~12 min | ~4 min |
| 02-brand-system | 2/2 complete | ~9 min | ~4.5 min |

*Updated after each plan completion*

## Accumulated Context

### Key Decisions This Milestone

- **DASH-05-01 (03-02):** recent-calls-table.tsx created in 03-02 (not 03-01) because 03-01 has a checkpoint and runs in a separate session; 03-01 will extend this file with Sheet/click logic.
- **DASH-05-02 (03-02):** isPending = processing_status !== 'complete' gates amber PendingBadge in Agent and Category cells; Sentiment and Flags cells left as-is (they already degrade to dash).


- **BRAND-01 (02-01):** Shield icon used as sidebar logo fallback (no logo.png found in public/). Orange bg-primary box on dark navy sidebar.
- **BRAND-02 (02-01):** @theme --font-heading was self-referential (var(--font-sans)) — fixed to var(--font-heading) so Montserrat resolves correctly via next/font injection.
- **BRAND-03 (02-01):** Sidebar active state uses sidebar-accent (brand-blue-hover) — correct lighter blue tint against dark navy background.
- **BRAND-02 (02-02):** space-y-4 is the standard page-root rhythm; py-2 is the standard data-row padding. Toolbar/pagination/card-header padding left at original values to avoid crowding controls.
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
- **n8n timestamp bug (known):** The nightly ingestion workflow adds 5 hours to call timestamps instead of treating portal IDs as UTC. All 168 existing records corrected in DB (2026-06-03). Fix the n8n `Code - Config` node before next ingestion run — the portal `term_id` timestamp IS in UTC; do not apply a CT→UTC offset.

### Resolved Concerns

- ~~DATA-01: Call Explorer shows no data~~ — Resolved in 01-01: Supabase one-to-one FK joins return objects not arrays; getCalls() and getCallDetail() fixed with Array.isArray() guard
- ~~`/api/audit/run` and `/api/audit/call-count` have no auth guards~~ — Resolved in 01-02: routes deleted, logic moved to server actions
- ~~DASH-06: Short call noise in all views~~ — Resolved in 01-03: MIN_CALL_DURATION_SECONDS = 25 applied to getCalls() and all 5 getDashboardData() sub-queries
- ~~DASH-07: No Digit robocalls in all views~~ — Resolved in 01-03: Covered by duration proxy (no release_cause column exists); deferred true field to v3
- ~~DASH-01: Chart tooltip z-index~~ — Resolved during Phase 2 verification: wrapperStyle zIndex:50 on both Recharts Tooltip components
- ~~DASH-02: Recent Calls shows time-only~~ — Resolved during Phase 2 verification: fmtTime updated to show date + time in CT; column renamed "Date / Time (CT)"
- ~~call_time_ct timestamps 5h ahead~~ — Resolved during Phase 2 verification: DB corrected (-5h on all 168 rows); root cause is n8n adding CDT offset to already-UTC portal timestamps (see Active Concerns)

### Pending Todos

None.

## Session Continuity

Last session: 2026-06-04T13:56:00Z
Stopped at: Completed 03-02-PLAN.md. Pending badges for agent/category on incomplete calls. Ready for 03-01 (slide-out panel — has checkpoint).
Resume file: None
