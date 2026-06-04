---
phase: 02-brand-system
plan: 01
subsystem: ui
tags: [tailwind, css-tokens, next-font, montserrat, open-sans, oklch, brand-colors, sidebar]

# Dependency graph
requires:
  - phase: 01-foundation-and-security
    provides: working Next.js app with Supabase data, dashboard, call explorer, audit flows
provides:
  - Brand color tokens in globals.css (:root and .dark)
  - Five colored chart tokens (orange, blue, green, amber, purple)
  - Montserrat (headings) + Open Sans (body) via next/font/google
  - Dark navy blue sidebar with orange logo box
affects:
  - 02-02 (dashboard polish — reads from same brand tokens)
  - all future phases that render UI

# Tech tracking
tech-stack:
  added: [Montserrat (Google Font), Open Sans (Google Font)]
  patterns:
    - Brand tokens defined in :root as CSS custom properties, mapped to Tailwind via @theme inline
    - next/font/google used to inject font CSS variables on <html> element at runtime
    - oklch() color space used for all brand colors

key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/components/layout/app-sidebar.tsx

key-decisions:
  - "Shield icon (not Bug) as sidebar logo fallback — no logo.png/logo.svg found in public/"
  - "Fixed @theme --font-heading to reference --font-heading not --font-sans (was self-referential)"
  - "Sidebar active state uses sidebar-accent (brand-blue-hover) not sidebar-primary — matches existing component structure"

patterns-established:
  - "Brand reference tokens (--brand-orange, --brand-blue, etc.) defined first in :root, then referenced by semantic tokens"
  - "DO NOT touch @theme inline block — only edit :root and .dark"
  - "Geist fonts are fully removed from this project"

# Metrics
duration: 3min
completed: 2026-06-04
---

# Phase 2 Plan 01: Brand Tokens, Fonts, and Logo Summary

**Brand Orange (#f26522) + Brand Blue (#233E7F) token system applied via oklch in globals.css, replacing all achromatic grays; Montserrat/Open Sans replace Geist; sidebar is now dark navy blue with orange Shield logo box**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-04T00:31:28Z
- **Completed:** 2026-06-04T00:33:59Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Brand color tokens defined in both :root and .dark — primary is now Brand Orange, sidebar is Brand Blue, five chart tokens are full color (orange, blue, green, amber, purple)
- Montserrat loaded as --font-heading and Open Sans as --font-sans via next/font/google; Geist fully removed
- Sidebar is dark navy blue with an orange bg-primary logo box containing a Shield icon (pest control = protection)

## Task Commits

Each task was committed atomically:

1. **Task 1: Define brand color tokens in globals.css** - `0144dbb` (feat)
2. **Task 2: Load Montserrat and Open Sans fonts** - `3504c49` (feat)
3. **Task 3: Brand the sidebar logo** - `02d6d96` (feat)

## Files Created/Modified

- `src/app/globals.css` - Brand reference tokens + semantic token remaps in :root and .dark; five colored chart tokens; @theme --font-heading fixed
- `src/app/layout.tsx` - Montserrat (--font-heading) + Open Sans (--font-sans) replacing Geist
- `src/components/layout/app-sidebar.tsx` - Bug icon replaced with Shield; no unused imports

## Decisions Made

- **Shield over Bug:** No logo.png or logo.svg found in public/. Shield chosen as the fallback icon — thematically appropriate (protection from pests).
- **@theme --font-heading fix:** The original `--font-heading: var(--font-sans)` in the @theme block was incorrect — it made headings use the sans variable. Fixed to `var(--font-heading)` so Montserrat resolves correctly at runtime via next/font injection.
- **Sidebar active state:** Kept the existing `bg-sidebar-accent` active class (not sidebar-primary) — this maps to brand-blue-hover which creates the correct lighter blue tint against the dark navy background.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed @theme --font-heading self-reference**

- **Found during:** Task 2 (font setup)
- **Issue:** @theme block had `--font-heading: var(--font-sans)` — this mapped font-heading to the sans variable, not the heading variable. Montserrat would never have applied to headings.
- **Fix:** Changed to `--font-heading: var(--font-heading)` so next/font's --font-heading runtime injection resolves correctly
- **Files modified:** src/app/globals.css
- **Verification:** Build passes; the fix is part of Task 1 commit
- **Committed in:** 0144dbb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix — without it Montserrat would not apply to any headings. No scope creep.

## Issues Encountered

None beyond the @theme bug documented above.

## User Setup Required

None - all changes are CSS/TypeScript, deployed to Vercel on next push.

## Next Phase Readiness

- All brand tokens are live — Plan 02-02 (dashboard KPI polish) can read from --brand-orange, --brand-blue, and the chart tokens directly
- Montserrat and Open Sans are globally available via font-heading and font-sans Tailwind utilities
- Sidebar dark blue background is set — any sidebar enhancements in later plans build on this foundation

---
*Phase: 02-brand-system*
*Completed: 2026-06-04*
