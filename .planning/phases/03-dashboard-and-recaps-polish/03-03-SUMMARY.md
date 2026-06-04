---
phase: 03-dashboard-and-recaps-polish
plan: 03
subsystem: ui
tags: [nextjs, react, tailwind, lucide, supabase, n8n, claude-haiku]

# Dependency graph
requires:
  - phase: 02-brand-system
    provides: Tailwind brand tokens, Montserrat/Open Sans typography, sidebar/card styling
  - phase: 01-foundation-and-security
    provides: Supabase data layer, /recaps page, createServiceClient, daily_recaps table
provides:
  - RecapHistory collapsible client component (src/components/recaps/recap-history.tsx)
  - Restructured /recaps page — featured latest recap with stats card + collapsible history
  - Exported Recap type, RecapCard, Stat helpers as shared exports from recap-history.tsx
  - n8n prompt spec for WoW-aware manager briefing (RECAP-01 — awaiting user to apply in n8n)
affects: [phase-04-trends, phase-05-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Set<string> toggle pattern for collapsible rows (mirroring ScorecardAccordion)"
    - "Client component owns card rendering; server page imports for featured render"
    - "Single source of truth: Recap type + RecapCard + Stat exported from recap-history.tsx"

key-files:
  created:
    - src/components/recaps/recap-history.tsx
  modified:
    - src/app/recaps/page.tsx

key-decisions:
  - "RECAP-02-A: RecapCard and Stat moved from page.tsx into recap-history.tsx (client component owns rendering; server page imports). Avoids 'use client' on page.tsx which would expose service role key."
  - "RECAP-02-B: Collapsed row summary derived from structured data (total_calls + calls_by_category max key), not truncated narrative — avoids misleading partial text."
  - "RECAP-02-C: Stats card on featured recap shows Total Calls, Top Category, Bookings (Scheduling+Rescheduling), Cancellations — derived inline from calls_by_category."
  - "RECAP-01: n8n prompt rewrite spec documented for user; awaiting manual application in n8n UI (cannot be automated — n8n-mcp writes are broken on n8n 2.23.2)."

patterns-established:
  - "Client component owns rendering logic; server page imports for data-pass pattern"
  - "Structured data for summaries — never truncate narrative for collapsed state"

# Metrics
duration: 5min
completed: 2026-06-04
---

# Phase 03 Plan 03: Recap Page Restructure Summary

**Collapsible recap history with featured latest recap + stats card; /recaps page is fully restructured with a RecapHistory client component — n8n prompt spec ready for user to apply**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-04T13:48:51Z
- **Completed:** 2026-06-04T13:53:47Z
- **Tasks:** 3/4 executed (Task 1: human-action checkpoint documented; Tasks 2+3: auto; Task 4: human-verify checkpoint — paused here)
- **Files modified:** 2

## Accomplishments
- Created `RecapHistory` client component with `Set<string>` collapsible toggle, one-line structured summary per row, and ChevronDown/Right expand indicator
- Moved `RecapCard`, `Stat`, and `Recap` type into recap-history.tsx as the single source of truth; page.tsx now imports them
- Restructured /recaps page: "Latest" section with 4-tile stats card (Total Calls, Top Category, Bookings, Cancellations), complaints flag, featured `RecapCard`; "Past 30 Days" section with `RecapHistory`
- Page remains a server component — service role key never exposed to client

## Task Commits

Each task was committed atomically:

1. **Task 1: n8n prompt rewrite spec (RECAP-01)** - Documented for user (human-action checkpoint — no commit)
2. **Task 2: Build RecapHistory collapsible component** - `4b56436` (feat)
3. **Task 3: Restructure /recaps page** - `0d9883b` (feat)
4. **Task 4: Human verify checkpoint** - Paused (awaiting user verification)

## Files Created/Modified
- `src/components/recaps/recap-history.tsx` - Client component: Recap type, RecapCard, Stat, RecapHistory collapsible list
- `src/app/recaps/page.tsx` - Server page: featured latest recap with stats card + RecapHistory for past recaps

## Decisions Made
- RecapCard and Stat moved from page.tsx into recap-history.tsx so the client component owns rendering and page.tsx stays a server component
- Collapsed row summary uses structured data (not truncated narrative): `{date} — {N} calls — {topCategory}`
- Stats card derived inline from featured.calls_by_category — no dedicated bookings_count column in DB (approximate via Scheduling + Rescheduling)
- RECAP-01 (n8n prompt rewrite) documented as instructions for the user; cannot be auto-applied because n8n-mcp writes are broken on n8n 2.23.2

## Deviations from Plan

None — plan executed exactly as written. The pre-existing lint error in `new-audit-modal.tsx` was noted but not introduced by this plan.

## Issues Encountered
- Ternary-as-statement lint warning on Set toggle in RecapHistory — fixed by converting to `if/else` block

## User Setup Required

**RECAP-01 requires manual n8n changes.** See Task 1 instructions in the checkpoint report:

1. Open n8n at automation.joystoneenterprises.com
2. Open workflow "Pfitzer Pulse - Daily Recap Generator" (ID: n5bZW9UQico9plTS)
3. Add HTTP Request node before "Code - Build Prompt" querying last 7 daily recaps for WoW average
4. Replace the prompt body in "Code - Build Prompt" with the manager briefing structure

## Next Phase Readiness
- /recaps page restructure complete and verified by build
- RECAP-01 (n8n prompt) pending human action — does not block phase completion
- Ready for Phase 4 (Trends) once Task 4 human-verify is approved

---
*Phase: 03-dashboard-and-recaps-polish*
*Completed: 2026-06-04 (partial — paused at Task 4 checkpoint)*
