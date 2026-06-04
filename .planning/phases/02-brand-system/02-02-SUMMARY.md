---
plan: 02-02
phase: 02-brand-system
status: complete
completed: 2026-06-03
subsystem: ui-layout
tags: [spacing, tailwind, layout, consistency]
requires: [02-01]
provides: [spacing-pass, visual-consistency]
affects: []
tech-stack:
  added: []
  patterns: [space-y-4 page roots, p-4 main wrapper, py-2 data rows]
key-files:
  created: []
  modified:
    - src/app/layout.tsx
    - src/app/dashboard/page.tsx
    - src/app/calls/[id]/page.tsx
    - src/app/audits/page.tsx
    - src/app/audits/[id]/page.tsx
    - src/app/recaps/page.tsx
    - src/app/trends/page.tsx
    - src/app/settings/page.tsx
    - src/components/calls/call-explorer.tsx
decisions:
  - "space-y-4 adopted as the standard page-root vertical rhythm across all pages"
  - "py-2 adopted as the standard data-row padding (down from py-3)"
  - "Main wrapper stays at p-4; toolbar, card headers, and pagination footer left at original padding to avoid crowding controls"
duration: ~6 min
---

# Phase 2 Plan 02: Spacing Pass and Visual Consistency Summary

**One-liner:** Surgical Tailwind spacing pass — main wrapper p-4, all page roots space-y-4, data rows py-2 — verified by human across all six tabs.

## What Was Built

A spacing normalization pass across the entire app. After 02-01 applied brand tokens and fonts, this plan tightened the density: the main content wrapper moved from p-6 to p-4, every page root moved from space-y-6 or space-y-5 to space-y-4, and data-table rows in both the dashboard recent-calls section and the Call Explorer moved from py-3 to py-2. Human verified the result looked dense, professional, and consistent across all tabs.

## Deliverables

| File | Change |
|------|--------|
| `src/app/layout.tsx` | `<main>` wrapper: `p-6` → `p-4` |
| `src/app/dashboard/page.tsx` | Page root: `space-y-6` → `space-y-4`; recent-calls table cells: `py-3` → `py-2` |
| `src/app/audits/page.tsx` | Page root: `space-y-6` → `space-y-4` |
| `src/app/recaps/page.tsx` | Page root: `space-y-6` → `space-y-4` |
| `src/app/trends/page.tsx` | Page root: `space-y-6` → `space-y-4` |
| `src/app/settings/page.tsx` | Page root: `space-y-6` → `space-y-4` |
| `src/app/calls/[id]/page.tsx` | Page root: `space-y-5` → `space-y-4` |
| `src/app/audits/[id]/page.tsx` | Page root: `space-y-5` → `space-y-4` |
| `src/components/calls/call-explorer.tsx` | `<th>` and `<td>` data rows: `py-3` → `py-2` |

## Commits

| Hash | Description |
|------|-------------|
| 87462da | feat(02-02): tighten main wrapper and page vertical rhythm |
| dc45baf | feat(02-02): normalize detail pages to space-y-4 |
| 3c6cc4c | feat(02-02): tighten table row padding in dashboard and call explorer |

## Requirements Met

- **BRAND-02:** Excessive spacing fixed — main p-4, all page roots space-y-4, data rows py-2. Pages feel dense and professional.
- **BRAND-03:** Visual consistency verified by human across all six tabs (Dashboard, Call Explorer, Trends, Recaps, Audits, Settings). Sidebar, header, cards, and tables share identical treatment.

## Decisions Made

- **Toolbar/pagination padding preserved:** Reduced py-3 → py-2 only on `<th>` and `<td>` data rows. The call-explorer toolbar (px-5 py-4) and pagination footer (px-4 py-3) were left untouched — tightening those would crowd interactive controls.
- **Card component unchanged:** `src/components/ui/card.tsx` padding was confirmed consistent in research; no changes needed.

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Phase 2 (Brand System) is now complete:
- 02-01: Brand tokens, fonts, logo applied
- 02-02: Spacing pass, visual consistency verified

Phase 3 (Call Explorer enhancements) can begin.
