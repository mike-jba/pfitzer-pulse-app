# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-03)

**Core value:** Karen and Garret can understand what's happening on every call without listening to recordings
**Current milestone:** v2 — Polish & Complete

## Current Position

Phase: Not started (defining roadmap)
Plan: —
Status: Requirements defined, roadmap being created
Last activity: 2026-06-03 — Milestone v2 started, 22 requirements defined

## Progress

```
Milestone v2: [░░░░░░░░░░] 0%
```

Phases: 0/? complete

## Codebase Context

- `.planning/codebase/` — 7 mapper docs (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS)
- `.planning/intel/` — 50 entity files + index.json + conventions.json + summary.md
- All created: 2026-06-03

## Accumulated Context

### Key Decisions This Milestone

- Auth deferred to v3 — dashboard URL not shared publicly, no immediate exposure risk
- Prompt/scoring editor in Settings deferred to v3 — too complex for v2
- Research skipped — codebase maps + CONCERNS.md provide sufficient context
- Settings scope: agent management + email config only (no password change without auth)

### Active Concerns

- DB types are stubs (not generated via Supabase CLI) — 110+ type assertion sites across data layer
- `unstable_noStore` deprecated API in use across data layer
- `/api/audit/run` and `/api/audit/call-count` have no auth guards (SEC-01 to fix)
- Audit score persistence is not transactional — partial failure risk
- Agent-to-call linkage relies on fuzzy AI name matching (`agent_name_inferred`)
- Supabase join shape inconsistency (array vs object) — defensive code scattered throughout

### Pending Todos

(None yet — new milestone)

## Session Continuity

Last session: 2026-06-03
Stopped at: Requirements defined (22 requirements, 8 areas). Spawning roadmapper next.
Resume file: None
