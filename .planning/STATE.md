# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-03)

**Core value:** Karen and Garret can understand what's happening on every call without listening to recordings
**Current focus:** Phase 2 — next phase (Phase 1 complete)

## Current Position

Phase: 2 of 5 (Brand System) — complete
Plan: 02 of 02 in phase complete
Status: Phase complete — ready for Phase 3
Last activity: 2026-06-03 — Completed 02-02-PLAN.md (Spacing Pass and Visual Consistency)

Progress: [██████░░░░] ~30%

Phases: 2/5 complete | Plans: 6 complete (01-research + 01-02 security + 01-01 data fix + 01-03 filtering + 02-01 brand tokens + 02-02 spacing pass)

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

### Resolved Concerns

- ~~DATA-01: Call Explorer shows no data~~ — Resolved in 01-01: Supabase one-to-one FK joins return objects not arrays; getCalls() and getCallDetail() fixed with Array.isArray() guard
- ~~`/api/audit/run` and `/api/audit/call-count` have no auth guards~~ — Resolved in 01-02: routes deleted, logic moved to server actions
- ~~DASH-06: Short call noise in all views~~ — Resolved in 01-03: MIN_CALL_DURATION_SECONDS = 25 applied to getCalls() and all 5 getDashboardData() sub-queries
- ~~DASH-07: No Digit robocalls in all views~~ — Resolved in 01-03: Covered by duration proxy (no release_cause column exists); deferred true field to v3

### Pending Todos

None.

## Session Continuity

Last session: 2026-06-03T00:00:00Z
Stopped at: Completed 02-02-PLAN.md. Full brand system (tokens + spacing) verified by human. Phase 2 complete. Ready for Phase 3.
Resume file: None
