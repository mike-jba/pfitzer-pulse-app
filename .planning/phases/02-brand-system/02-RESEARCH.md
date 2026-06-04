# Phase 2: Brand System - Research

**Researched:** 2026-06-03
**Domain:** Tailwind CSS v4 / shadcn/ui theming, Next.js 16 App Router, brand tokens, spacing audit
**Confidence:** HIGH (all findings from direct codebase inspection)

> **⚠ BRAND CORRECTION (2026-06-03):** The brand direction section below proposed a
> forest-green palette and Geist font. These are WRONG. The official Pfitzer Pest Control
> brand is:
> - **Primary (CTAs/buttons):** Brand Orange `#f26522` → `oklch(0.65 0.19 43)`
> - **Navigation/sidebar:** Brand Blue `#233E7F` → `oklch(0.31 0.13 262)`
> - **Heading font:** Montserrat (loaded via next/font/google)
> - **Body font:** Open Sans (loaded via next/font/google)
> - Geist is removed entirely. The green palette is not used.
> See CLAUDE.md "Brand Profile — Pfitzer Pest Control" for the authoritative reference.
> The Tailwind v4 patterns, spacing audit, and codebase findings below remain accurate.

## Summary

The codebase uses Tailwind CSS v4 (no tailwind.config.ts — v4 configures entirely through
globals.css `@theme` blocks), shadcn/ui with the "base-nova" style, and Geist Sans from
Google Fonts. The current theme is a stock neutral gray palette with zero brand color —
`--primary` is near-black (`oklch(0.205 0 0)`), `--accent` is a light gray. There is no
logo asset in `public/`; the sidebar has a placeholder using the Lucide `Bug` icon inside
a rounded square box. All spacing uses Tailwind utility classes applied inline — there is
no spacing design token layer.

The "excessive whitespace" is primarily from two sources: the root `<main>` wrapper in
`layout.tsx` uses `p-6` (24px all sides), and every page opens with `space-y-6` (24px
vertical rhythm). Tables and cards use `py-3`/`py-4` row padding throughout. These are
moderate values — the feeling of spaciousness comes from combining them with the `bg-muted/30`
main background creating visual emptiness around white cards.

The standard approach for this stack: override CSS custom properties in `:root {}` inside
`globals.css`, extend Tailwind's `@theme` block to expose custom tokens, and update
`--sidebar-*` variables for sidebar theming. No separate config file is needed or appropriate
for Tailwind v4. shadcn/ui reads all values from CSS variables automatically.

**Primary recommendation:** Define brand tokens as CSS custom properties in globals.css
(`:root` block), expose them via `@theme inline`, and do a surgical spacing pass reducing
`p-6` → `p-4` on main, `space-y-6` → `space-y-4` on page roots, and `py-3`/`py-4`
table rows → `py-2`/`py-3`. No new dependencies needed.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| tailwindcss | ^4 | Utility CSS | v4 — config via globals.css, no tailwind.config.ts |
| shadcn | ^4.10.0 | Component library | Reads CSS custom properties automatically |
| next/font/google | (Next 16) | Font loading | Geist is loaded; add Inter or keep Geist |
| lucide-react | ^1.17.0 | Icons | Already used throughout, keep |

### No Additional Libraries Needed
Brand theming for this stack requires zero new packages. Everything lives in CSS.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS vars in globals.css | Separate brand-tokens.css | No benefit; globals.css is already the single CSS entry point |
| Overriding `--primary` | Adding new custom color scale | Simpler; shadcn components use `--primary` automatically |
| Geist font | Inter, DM Sans, or system fonts | Geist is already loaded and professional-looking — switching fonts is optional |

---

## Architecture Patterns

### How Tailwind v4 Theming Works (CRITICAL)

There is **no `tailwind.config.ts`** in this project. Tailwind v4 is configured entirely
through `globals.css`. The pattern is:

```css
/* In globals.css — two layers work together */

/* 1. Define raw CSS variables on :root */
:root {
  --brand-green: oklch(0.45 0.15 145);
  --brand-green-light: oklch(0.92 0.06 145);
}

/* 2. Expose them as Tailwind design tokens via @theme */
@theme inline {
  --color-primary: var(--brand-green);
  --color-primary-foreground: oklch(0.985 0 0);
}
```

After step 2, `bg-primary`, `text-primary`, `border-primary` all use the brand green.
shadcn/ui components that use `bg-primary` or `text-primary` update automatically.

### How shadcn/ui Sidebar Variables Work

The sidebar has its own variable set already defined:
- `--sidebar` — sidebar background
- `--sidebar-foreground` — text
- `--sidebar-primary` — active item background (currently near-black)
- `--sidebar-primary-foreground` — active item text
- `--sidebar-accent` — hover state background
- `--sidebar-accent-foreground` — hover text
- `--sidebar-border` — border between sidebar and content

These must be overridden in `:root` to brand the sidebar independently of page content.

### Recommended File Change Locations

```
globals.css          ← ALL color token changes go here (both :root and @theme)
src/app/layout.tsx   ← font swap (if any), main p-6 → p-4
src/components/layout/app-sidebar.tsx  ← logo asset swap, Bug icon removal
src/components/layout/header.tsx       ← (minor) avatar initials if desired
src/app/dashboard/page.tsx             ← space-y-6 → space-y-4, gap-4 review
src/app/calls/ (call-explorer.tsx)     ← space-y-4 and filter bar p-4 already tight
src/app/audits/page.tsx                ← space-y-6 → space-y-4
src/app/recaps/page.tsx                ← space-y-6 → space-y-4
src/app/trends/page.tsx                ← stub page, minimal work
src/app/settings/page.tsx              ← stub page, minimal work
public/                                ← logo asset (SVG or PNG) goes here
```

### Anti-Patterns to Avoid
- **Adding a tailwind.config.ts:** Tailwind v4 does not use it. Adding one would conflict.
- **Using NEXT_PUBLIC for brand colors:** Colors belong in CSS, not env vars.
- **Creating a separate CSS file for brand tokens:** globals.css is the single entry point; splitting creates import order issues.
- **Using arbitrary Tailwind values for brand colors:** Define the token once in globals.css, then use the semantic token (`bg-primary`, not `bg-[#2d6a2d]`) everywhere.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading | Manual @font-face | `next/font/google` | Already in use; handles optimization, preload, CLS |
| Color contrast checks | Manual hex math | Browser DevTools / axe | One-time design check, not code |
| Logo SVG | PNG screenshot | SVG file in public/ | SVGs scale infinitely, no blurriness at any size |
| Dark mode toggle | Custom state | shadcn/ui already has `.dark` class pattern | globals.css already defines `.dark {}` block |

---

## Current State — Exact Findings

### Font Setup
```tsx
// src/app/layout.tsx (current)
import { Geist } from "next/font/google";
const geist = Geist({
  variable: "--font-geist-sans",  // sets CSS var --font-geist-sans
  subsets: ["latin"],
});
// Applied as: className={`${geist.variable} h-full antialiased`}
```
Note: `globals.css` maps `--font-sans: var(--font-geist-mono)` (typo — uses mono var) and
`--font-heading: var(--font-sans)`. The variable name is `--font-geist-sans` but globals.css
references `--font-sans`. This needs to be reconciled. The body uses `font-sans` class.

**Actual issue:** layout.tsx loads `Geist` with `variable: "--font-geist-sans"`, but globals.css
`@theme` maps `--font-sans: var(--font-sans)` (self-referential) and `--font-mono: var(--font-geist-mono)`
(undefined variable). The font works because Tailwind's default `font-sans` stack acts as fallback,
but the custom font variable is not wired up correctly.

**Fix:** Change `variable: "--font-geist-sans"` to `variable: "--font-sans"` OR update globals.css
`@theme` to map `--font-sans: var(--font-geist-sans)`.

### Color Palette — Current Values (all achromatic gray)
```
--primary: oklch(0.205 0 0)          ← near-black (used for sidebar logo box, avatar, active states)
--primary-foreground: oklch(0.985 0 0) ← near-white
--secondary: oklch(0.97 0 0)         ← very light gray
--accent: oklch(0.97 0 0)            ← same as secondary
--muted: oklch(0.97 0 0)             ← same
--muted-foreground: oklch(0.556 0 0) ← medium gray (used everywhere for labels)
--background: oklch(1 0 0)           ← pure white
--sidebar: oklch(0.985 0 0)          ← near-white (sidebar bg)
--sidebar-primary: oklch(0.205 0 0)  ← near-black (active nav item)
--chart-1 through chart-5: gray shades only ← charts are also gray
```

### Logo — Current State
```tsx
// src/components/layout/app-sidebar.tsx lines 31-43
<div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
    <Bug className="h-4 w-4 text-primary-foreground" />  {/* ← placeholder */}
  </div>
  <div className="flex flex-col leading-none">
    <span className="text-sm font-semibold text-sidebar-foreground">Pfitzer Pulse</span>
    <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Call Intelligence</span>
  </div>
</div>
```
No logo file exists in `public/`. The five SVGs present (`file.svg`, `globe.svg`, `next.svg`,
`vercel.svg`, `window.svg`) are Next.js boilerplate — not brand assets.

### Spacing — Whitespace Sources
| Location | Class | Effect | Action |
|----------|-------|--------|--------|
| `layout.tsx` `<main>` | `p-6` | 24px padding all sides on every page | Reduce to `p-4` (16px) |
| Every page root | `space-y-6` | 24px gap between sections | Reduce to `space-y-4` (16px) |
| Table rows (dashboard, calls) | `py-3` | 12px row height | Reduce to `py-2` (8px) |
| Card headers | `pb-2`, `pb-3` | standard shadcn | Keep — appropriate |
| Filter bar (call-explorer) | `p-4 space-y-3` | already tighter | Keep |
| Audit/recap cards | `CardContent py-4` | shadcn default | Reduce outer wrapper `space-y-6` only |
| `audits/page.tsx` h1 section | `space-y-6` | large section gap | Reduce to `space-y-4` |

### Pages That Need Spacing Audit
1. `/dashboard` — `space-y-6` root, `gap-4` grids (keep grids)
2. `/calls` (call-explorer) — `space-y-4` already, filter bar `p-4` (acceptable)
3. `/calls/[id]` — `space-y-5` (close, minor reduction to `space-y-4`)
4. `/audits` — `space-y-6`, card `CardContent` has no extra padding (acceptable)
5. `/recaps` — `space-y-6` root, `space-y-4` inner (reduce root only)
6. `/trends` — stub page with `py-16` empty state (fine for stub)
7. `/settings` — stub page with `py-16` empty state (fine for stub)

### Card Style Inventory (current — already consistent)
All content cards use the pattern: `<Card>` with `rounded-xl border bg-card shadow-sm`.
TanStack table wrapper uses the same: `rounded-xl border bg-card shadow-sm`.
This is already consistent — no work needed on card structure.

### Hardcoded Semantic Colors (NOT in design tokens)
These colors are used inline and would need to be kept or converted to tokens if brand
palette introduces conflicts:
- `text-emerald-500/600/700`, `bg-emerald-100` — success/positive/sales
- `text-amber-500/600/700`, `bg-amber-100` — warning/follow-up
- `text-red-500/600/700`, `bg-red-100` — danger/complaint
- `text-blue-500/700`, `bg-blue-100` — inbound/booking
- `text-orange-500` — outbound direction
- Chart colors: all gray (`oklch(0.87 0 0)` through `oklch(0.269 0 0)`)

These semantic colors (red/amber/green/blue) are appropriate and should NOT be replaced
with brand palette — they carry meaning. The chart colors are the most impactful brand
opportunity since they are currently invisible (gray on white).

---

## Brand Direction Recommendation

**Palette for pest control business:** Green-earth primary, off-white/warm background.

Suggested token values (planner should verify with user or use as default):

```css
:root {
  /* Brand primary — forest/professional green */
  --brand-primary: oklch(0.40 0.12 145);          /* dark green */
  --brand-primary-foreground: oklch(0.98 0 0);    /* white */
  --brand-primary-light: oklch(0.92 0.04 145);    /* very light green tint */

  /* Neutral warm gray (replaces cold gray) */
  --brand-muted: oklch(0.96 0.005 85);            /* warm off-white */
  --brand-muted-fg: oklch(0.50 0.01 85);          /* warm medium gray */

  /* Background — very slightly warm white */
  --brand-background: oklch(0.99 0.003 85);
}
```

Map to shadcn tokens:
```css
/* In @theme inline block */
--color-primary: var(--brand-primary);
--color-primary-foreground: var(--brand-primary-foreground);
--color-accent: var(--brand-primary-light);
--color-sidebar-primary: var(--brand-primary);
--color-sidebar-primary-foreground: var(--brand-primary-foreground);
--color-muted: var(--brand-muted);
--color-background: var(--brand-background);

/* Chart colors — give charts actual color */
--color-chart-1: oklch(0.52 0.14 145);   /* green */
--color-chart-2: oklch(0.52 0.12 200);   /* teal */
--color-chart-3: oklch(0.60 0.12 85);    /* amber */
--color-chart-4: oklch(0.55 0.13 30);    /* orange */
--color-chart-5: oklch(0.48 0.12 260);   /* slate-blue */
```

---

## Code Examples

### Pattern 1: Adding brand token to globals.css (Tailwind v4 pattern)
```css
/* Source: direct codebase inspection of globals.css */

/* Step 1: raw CSS variable */
:root {
  --brand-green: oklch(0.40 0.12 145);
}

/* Step 2: wire to Tailwind via @theme (already exists in file) */
@theme inline {
  --color-primary: var(--brand-green);
}

/* shadcn components using bg-primary now use brand green automatically */
```

### Pattern 2: Logo swap in sidebar (replacing Bug icon)
```tsx
// src/components/layout/app-sidebar.tsx
import Image from "next/image";

// Replace the Bug icon placeholder:
<div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
  <Image
    src="/pfitzer-logo.svg"          // asset placed in public/
    alt="Pfitzer Pest Control"
    width={32}
    height={32}
    className="shrink-0"
  />
  <div className="flex flex-col leading-none">
    <span className="text-sm font-semibold text-sidebar-foreground">Pfitzer Pulse</span>
    <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">
      Call Intelligence
    </span>
  </div>
</div>
```
If no logo SVG is available, keep the colored square icon but replace `Bug` with a more
appropriate icon (e.g., `Shield`, `Activity`, or a simple text monogram "PP").

### Pattern 3: Font variable fix
```tsx
// src/app/layout.tsx — fix variable name mismatch
const geist = Geist({
  variable: "--font-sans",   // changed from "--font-geist-sans"
  subsets: ["latin"],
});
```
This makes globals.css `@theme inline { --font-sans: var(--font-sans); }` actually resolve
to the loaded Geist font.

### Pattern 4: Spacing reduction (layout.tsx)
```tsx
// src/app/layout.tsx line 28 — reduce main padding
<main className="flex-1 overflow-y-auto bg-muted/30 p-4">  {/* was p-6 */}
```

### Pattern 5: Spacing reduction (page root)
```tsx
// All pages — reduce section gap
<div className="space-y-4">  {/* was space-y-6 */}
```

### Pattern 6: Table row tightening
```tsx
// dashboard/page.tsx and call-explorer.tsx table headers
<th className="px-4 py-2 text-left font-medium">  {/* was py-3 */}
// table data rows
<td className="px-4 py-2">  {/* was py-3 */}
```

---

## Common Pitfalls

### Pitfall 1: Editing a non-existent tailwind.config.ts
**What goes wrong:** Developer creates a tailwind.config.ts thinking it's needed. Tailwind v4
ignores it. Colors appear to not apply.
**Why it happens:** Tailwind v3 used tailwind.config.js/ts. v4 changed to CSS-first config.
**How to avoid:** All color/font customization goes in globals.css `@theme` block only.

### Pitfall 2: oklch color values with wrong syntax
**What goes wrong:** Colors don't render; browser shows fallback. oklch requires space-separated
values: `oklch(0.40 0.12 145)` NOT `oklch(40%, 0.12, 145)`.
**How to avoid:** Match the exact format already in globals.css (space-separated, decimal 0-1 for
lightness, 0-0.4 for chroma, 0-360 for hue).

### Pitfall 3: Changing only `--color-primary` in `@theme` but not `:root`
**What goes wrong:** The `@theme inline` block maps `--color-primary: var(--primary)`. If you
add `--color-primary: oklch(...)` directly in `@theme`, it works. But if you expect to read it
back as a CSS variable from JS/runtime, it won't work.
**How to avoid:** Define the value in `:root` as `--brand-green`, reference it in both `:root`
(as `--primary: var(--brand-green)`) and `@theme inline` (as `--color-primary: var(--brand-green)`).

### Pitfall 4: shadcn "dark" mode sidebar using wrong values
**What goes wrong:** After brand changes, the `.dark` sidebar looks wrong — `--sidebar-primary`
in `.dark` block still points to the blue default value `oklch(0.488 0.243 264.376)`.
**How to avoid:** Update BOTH `:root` and `.dark` blocks in globals.css.

### Pitfall 5: Logo file format
**What goes wrong:** PNG logo looks blurry in sidebar because it's displayed at 32×32px from a
larger source. Or PNG has white background that clashes with sidebar background.
**How to avoid:** Request SVG format from client. If only PNG is available, ensure it has
a transparent background and is provided at 2x resolution (64×64 for 32px display).

---

## Open Questions

1. **Logo asset**
   - What we know: No logo file exists in `public/`. The docs/ folder has a scorecard PDF, not a logo.
   - What's unclear: Whether Pfitzer Pest Control has an SVG or transparent PNG logo available.
   - Recommendation: Planner should add a task "Obtain logo asset from user" as a prerequisite for the logo swap task. Include a fallback: if no logo is provided, replace `Bug` icon with a better placeholder (e.g., a green shield icon with "PP" text).

2. **Exact brand color values**
   - What we know: No style guide exists. Green/earthy palette is appropriate for pest control.
   - What's unclear: Whether user has brand hex colors or specific preferences.
   - Recommendation: Planner should define sensible defaults (green-primary) and document them in a `src/lib/brand-tokens.ts` comment file for reference, with a note that the user can adjust. The defaults proposed above are reasonable.

3. **Font preference**
   - What we know: Geist is currently loaded. The font variable wiring has a bug.
   - What's unclear: Whether user wants to keep Geist or switch to something more "traditional business" (Inter, DM Sans).
   - Recommendation: Fix the font variable wiring bug and keep Geist. It's a professional sans-serif. Switching fonts adds risk with no clear upside.

---

## Sources

### Primary (HIGH confidence — direct file inspection)
- `src/app/globals.css` — complete CSS variable definitions, @theme block
- `src/app/layout.tsx` — font setup, main wrapper padding
- `src/components/layout/app-sidebar.tsx` — logo placeholder, sidebar structure
- `src/components/layout/header.tsx` — header structure
- `src/components/dashboard/kpi-card.tsx` — card spacing pattern
- `src/app/dashboard/page.tsx` — spacing classes, table structure
- `src/components/calls/call-explorer.tsx` — filter bar, table, pagination
- `src/app/calls/[id]/page.tsx` — detail page spacing
- `src/app/audits/page.tsx` — audits page spacing
- `src/app/recaps/page.tsx` — recaps page spacing
- `components.json` — shadcn style: "base-nova", baseColor: "neutral", cssVariables: true
- `package.json` — tailwindcss ^4, next 16.2.7, shadcn ^4.10.0
- `public/` directory listing — no logo assets present

### Secondary (MEDIUM confidence)
- Tailwind v4 CSS-first config behavior: confirmed by absence of tailwind.config.ts and
  presence of `@import "tailwindcss"` + `@theme inline` in globals.css

---

## Metadata

**Confidence breakdown:**
- Current codebase state: HIGH — all from direct file reads
- Tailwind v4 theming pattern: HIGH — confirmed from globals.css structure
- Brand color recommendations: MEDIUM — reasonable defaults, no style guide exists
- Logo situation: HIGH — confirmed no asset exists in public/
- Spacing root cause: HIGH — exact classes identified in exact files

**Research date:** 2026-06-03
**Valid until:** 2026-07-03 (stable stack — Next/Tailwind/shadcn versions unlikely to change)
