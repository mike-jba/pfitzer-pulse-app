---
phase: 03-dashboard-and-recaps-polish
plan: 02
subsystem: ui
tags: [react, nextjs, tailwind, supabase, dashboard, badge]

# Dependency graph
requires:
  - phase: 01-foundation-and-security
    provides: dashboard.ts data layer with RecentCall type and getDashboardData()
provides:
  - processing_status field on RecentCall type and in Supabase query
  - RecentCallsTable client component with Pending badge logic for incomplete calls
affects:
  - 03-01 (builds on recent-calls-table.tsx created here — will add Sheet/click logic)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pending badge pattern: amber pill (bg-amber-100 text-amber-700) for in-progress AI analysis cells"
    - "isPending = processing_status !== 'complete' as per-row boolean gating cell render"

key-files:
  created:
    - src/components/dashboard/recent-calls-table.tsx
  modified:
    - src/lib/data/dashboard.ts

key-decisions:
  - "DASH-05-01: minimal recent-calls-table.tsx created in 03-02 (not 03-01) because 03-01 has a checkpoint and runs in a separate session; 03-01 will extend this file with Sheet/click logic"
  - "DASH-05-02: pre-existing lint error in new-audit-modal.tsx (react-hooks/set-state-in-effect) is not introduced by this plan — confirmed by stash test"

patterns-established:
  - "PendingBadge: small amber rounded-full pill at text-[11px] — use this pattern for any 'in-flight' state in table cells"

# Metrics
duration: 8min
completed: 2026-06-04
---

# Phase 3 Plan 02: Dashboard Pending Badges Summary

**processing_status threaded into RecentCall query and type; amber Pending badges shown for agent and category on calls awaiting AI analysis (DASH-05)**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-04T13:48:17Z
- **Completed:** 2026-06-04T13:56:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `processing_status` to `RecentCall` type and Supabase `.select()` in `dashboard.ts`
- Created `src/components/dashboard/recent-calls-table.tsx` as a client component with `PendingBadge` helper
- Agent cell: renders amber "Pending" pill when `processing_status !== 'complete'`, real agent name otherwise
- Category cell: renders amber "Pending" pill when pending, `<Badge variant="secondary">` or dash for complete calls
- All calls remain visible — no rows hidden, no filtering by status

## Task Commits

Each task was committed atomically:

1. **Task 1: Add processing_status to RecentCall type and query** - `13f2edb` (feat)
2. **Task 2: Create RecentCallsTable with Pending badges** - `bb8d84d` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/lib/data/dashboard.ts` - Added `processing_status: string | null` to RecentCall type and to the recentResult `.select()` string
- `src/components/dashboard/recent-calls-table.tsx` - New client component: table markup extracted from dashboard/page.tsx, PendingBadge helper, isPending gate on agent and category cells

## Decisions Made
- Created `recent-calls-table.tsx` here (in 03-02) rather than waiting for 03-01, per the coordination note. Plan 03-01 will extend this component with Sheet/click-to-detail logic in its own session.
- Pre-existing lint error (`react-hooks/set-state-in-effect` in `new-audit-modal.tsx`) verified by stash test to pre-date this plan — not introduced by these changes.

## Deviations from Plan

None - plan executed exactly as written. The coordination note scenario (03-01 file not yet created) was anticipated and handled per the documented instructions.

## Issues Encountered
- `npm run lint` exits non-zero due to a pre-existing error in `src/components/audits/new-audit-modal.tsx` (`react-hooks/set-state-in-effect`). Confirmed pre-existing via git stash test. No new lint errors introduced by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `processing_status` is now on `RecentCall` and selectable from Supabase
- `recent-calls-table.tsx` exists and exports `RecentCallsTable` — ready for 03-01 to extend with Sheet/click logic
- Dashboard page still renders the inline table; 03-01's Task 2 will wire `<RecentCallsTable calls={recentCalls} />` into `dashboard/page.tsx`

---
*Phase: 03-dashboard-and-recaps-polish*
*Completed: 2026-06-04*
