---
phase: 03-dashboard-and-recaps-polish
plan: 01
subsystem: ui
tags: [nextjs, react, server-actions, base-ui, sheet, dashboard, call-detail]

# Dependency graph
requires:
  - phase: 02-brand-system
    provides: visual tokens, spacing conventions
  - phase: 01-foundation-and-security
    provides: call-detail data layer (getCallDetail, CallDetailData), dashboard data layer
provides:
  - Shared CallDetailContent presentational component (metadata + AI analysis + transcript)
  - getCallDetailAction Server Action wrapping getCallDetail for on-demand client fetches
  - Client RecentCallsTable with clickable rows opening a Base UI Sheet panel
  - Tightened Recent Calls row density (px-3/py-1.5 instead of px-4/py-2)
affects:
  - 03-02 (may use RecentCallsTable or CallDetailContent for further polish)
  - Any future feature using call detail in a panel or modal context

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Action as thin wrapper around server-only data function (call-detail.ts)
    - Shared presentational component consumed in both server page and client panel
    - Client component inlines pure utility (parseTranscript) to avoid server-only import error
    - Base UI Dialog (via Sheet) controlled with open/onOpenChange for slide-out panels

key-files:
  created:
    - src/lib/actions/call-detail.ts
    - src/components/calls/call-detail-content.tsx
  modified:
    - src/app/calls/[id]/page.tsx
    - src/components/dashboard/recent-calls-table.tsx
    - src/app/dashboard/page.tsx

key-decisions:
  - "parseTranscript inlined in client component — source is in server-only module; type import works but runtime import does not"
  - "sentimentColors re-exported from CallDetailContent so the /calls/[id] page can use it without duplication"
  - "Sheet panel shows CallDetailContent (no back link, no header chip row, no Processing Events) — panel is for quick inspection, not full detail"
  - "RecentCallsTable is a client island; dashboard page.tsx remains a server component"

patterns-established:
  - "Server Action pattern: 'use server' file wraps server-only data fn for client component consumption"
  - "Shared presentational component pattern: no 'use client', safe in server and client trees"
  - "Client island pattern: client table component inside server page — state/interactivity isolated"

# Metrics
duration: 8min
completed: 2026-06-04
---

# Phase 03 Plan 01: Dashboard Click-to-Detail Summary

**Clickable Recent Calls table with Base UI Sheet slide-out panel showing full call detail (metadata, AI analysis, transcript) without navigating away from the dashboard**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-04T13:49:12Z
- **Completed:** 2026-06-04T13:56:52Z
- **Tasks:** 2 of 3 complete (Task 3 is checkpoint:human-verify — awaiting)
- **Files modified:** 5

## Accomplishments

- Extracted shared `CallDetailContent` presentational component (Call Details, AI Analysis, Transcript cards) from the `/calls/[id]` page — now consumed in both the page and the dashboard slide-out
- Created `getCallDetailAction` Server Action so client components can fetch call detail on demand without exposing server-only modules
- Replaced the static inline dashboard table with a `RecentCallsTable` client component — rows are clickable, open a Base UI Sheet panel on the right with that call's full detail
- Tightened row density: `px-4 py-2` → `px-3 py-1.5`, caller number font size `text-[11px] leading-tight`

## Task Commits

1. **Task 1: Extract shared CallDetailContent and Server Action** - `5fb3139` (feat)
2. **Task 2: Build client RecentCallsTable with slide-out panel** - `7338bb0` (feat)

_Task 3 is checkpoint:human-verify — no commit yet._

## Files Created/Modified

- `src/lib/actions/call-detail.ts` — Server Action: `getCallDetailAction(id)` wraps `getCallDetail`
- `src/components/calls/call-detail-content.tsx` — Shared presentational component; exports `CallDetailContent` and `sentimentColors`
- `src/app/calls/[id]/page.tsx` — Refactored to consume `CallDetailContent`; retains back link, header, status chips, AuditCallButton, Processing Events
- `src/components/dashboard/recent-calls-table.tsx` — Client component: state, row click handler, Sheet panel, tighter row density
- `src/app/dashboard/page.tsx` — Simplified: removed inline table, imports `RecentCallsTable`

## Decisions Made

- **parseTranscript inlined in client component:** `call-detail.ts` has `import "server-only"` which prevents runtime import from client components. Type imports compile away fine but the runtime function can't cross the boundary. Inlined the pure string parser in `recent-calls-table.tsx`.
- **sentimentColors re-exported from CallDetailContent:** Avoids duplicating the map; the `/calls/[id]` page imports it alongside `CallDetailContent`.
- **Sheet panel excludes back link, header chips, Processing Events:** Panel is for quick inspection. Full detail with all context remains on `/calls/[id]`.
- **Dashboard page remains server component:** Only `RecentCallsTable` is a client island — data fetch still happens server-side.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inlined parseTranscript to resolve server-only boundary error**

- **Found during:** Task 2 (build check)
- **Issue:** `recent-calls-table.tsx` (client component) imported `parseTranscript` from `@/lib/data/call-detail` which has `import "server-only"` — Next.js build failed with "It should only be used from a Server Component"
- **Fix:** Removed the `parseTranscript` import; inlined an identical copy of the pure string parser directly in the client component with an explanatory comment
- **Files modified:** `src/components/dashboard/recent-calls-table.tsx`
- **Verification:** `npm run build` passes
- **Committed in:** `7338bb0` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for build correctness. No scope creep. parseTranscript is a trivial pure function; duplication is acceptable.

## Issues Encountered

- `recent-calls-table.tsx` already existed from a previous untracked phase with a `processing_status`-based `PendingBadge` feature and `px-4 py-2` density — replaced entirely per the plan.

## Next Phase Readiness

- Task 3 (checkpoint:human-verify) pending — user must verify clickable rows, panel behavior, and row density in the browser
- Once approved, STATE.md and plan metadata commit will be made
- Phase 03 Plan 02 can proceed after Task 3 approval

---
*Phase: 03-dashboard-and-recaps-polish*
*Completed: 2026-06-04 (partial — awaiting checkpoint approval)*
