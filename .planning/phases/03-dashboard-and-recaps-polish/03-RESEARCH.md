# Phase 3: Dashboard & Recaps Polish - Research

**Researched:** 2026-06-04
**Domain:** Next.js App Router — client interactivity, codebase architecture
**Confidence:** HIGH (all findings from direct codebase inspection)

## Summary

Phase 3 is a frontend polish pass, not an infrastructure change. All research was done by reading the
actual source files — no external library lookups were needed because the stack is already locked and
in use.

The dashboard's Recent Calls section is a server component table inside `src/app/dashboard/page.tsx`.
It has no client interactivity today. Adding the slide-out panel requires extracting a client boundary
and adding a Server Action (or a small API route) to fetch call detail on demand. The Sheet component
(`src/components/ui/sheet.tsx`) already exists and is wired to `@base-ui/react`'s Dialog primitive.

The `/recaps` page already has a stats row and narrative per recap. The required changes are structural:
feature the most recent recap at full size, and convert the rest to collapsible accordion rows. A manual
collapsible (useState toggle) is the right pattern here — the existing ScorecardAccordion in the audits
feature demonstrates the exact approach already used in this codebase.

The Claude recap prompt lives entirely in n8n (not in this repo). Only the Zod schema and the API route
`src/app/api/ingest/recap/route.ts` live here. Fixing the prompt means updating the n8n workflow node;
no Next.js code changes are required for RECAP-01.

**Primary recommendation:** Treat DASH-03 (slide-out panel) as the most complex task — it requires a
new client component, a Server Action for call detail fetch, and a widened Sheet. Everything else is
CSS/markup adjustment.

---

## Existing Code Inventory

### Recent Calls — current state

**File:** `src/app/dashboard/page.tsx` (server component, 228 lines)

Key facts:
- The entire page is a server component — no `"use client"` directive.
- Recent Calls is a raw `<table>` rendered directly in the page file, not a separate component.
- Query is in `src/lib/data/dashboard.ts`, function `getDashboardData()`, `recentCalls` result.
- Fetches 20 rows, ordered by `call_time_ct` descending, filtered `duration_seconds > 25`.
- Row columns: Date/Time, Caller (name + number stacked), Agent, Duration, Category, Sentiment, Flags.
- No `processing_status` field in the `RecentCall` type — currently no way to show "Pending" badge
  without adding that field to the query and type.
- Current row padding: `py-2` on `<td>` — already compact. No obvious excess vertical space issue at
  the CSS level; the stacked Caller cell (name + number in two divs) is the main height driver.

**`RecentCall` type** (`src/lib/data/dashboard.ts`, lines 33-46):
```typescript
export type RecentCall = {
  id: string;
  call_time_ct: string | null;
  from_name: string | null;
  from_number: string | null;
  agent_name_inferred: string | null;   // from calls table (denormalized from analysis)
  duration_seconds: number | null;
  primary_category: string | null;      // from calls table (denormalized from analysis)
  sentiment: string | null;
  follow_up_required: boolean | null;
  complaint_flag: boolean | null;
  sales_opportunity_flag: boolean | null;
  direction: string | null;
  // NOTE: processing_status NOT currently included
};
```

**DASH-05 gap:** `processing_status` must be added to the query SELECT and the `RecentCall` type to
support the Pending badge logic. The `processingStatusSchema` in `src/lib/api/schemas.ts` lists
`'complete'` as the only "fully analyzed" status. Badge should show when status !== 'complete'.

**Agent/category display bug (DASH-05):** `agent_name_inferred` and `primary_category` on the `calls`
table are denormalized from `call_analysis` by the `/api/ingest/analysis` route. Calls that have not
reached `complete` status will have null values for these columns. The current code renders `—` for
null — correct behavior, but CONTEXT.md requires showing "Pending" instead of `—` for these calls.

### Recent Calls — slide-out panel requirements (DASH-03)

The dashboard `page.tsx` is a server component. Rows need `onClick`. Two implementation options:

**Option A — Extract client component wrapper (recommended):**
- Keep `getDashboardData()` in the server component.
- Pass `recentCalls` as a prop to a new `"use client"` component: `RecentCallsTable`.
- The client component manages `selectedCallId` state and renders the Sheet.
- Call detail is fetched via a new Server Action `getCallDetailAction(id: string)` — mirrors the
  existing `getCallDetail()` data function, wrapped in `'use server'`.

**Option B — Route-based approach (rejected per CONTEXT.md):**
- Navigate to `/calls/[id]` on row click. CONTEXT.md explicitly requires slide-out panel, not navigation.

**Server Action pattern:** The existing `src/lib/actions/audit.ts` demonstrates `'use server'` + 
Supabase service client. A `getCallDetailAction` can directly call the existing `getCallDetail()` 
function from `src/lib/data/call-detail.ts` (which already fetches full detail including transcript,
analysis, events).

### Sheet component — current configuration

**File:** `src/components/ui/sheet.tsx` (139 lines)

Key facts:
- Built on `@base-ui/react` Dialog (not Radix UI — this project uses base-ui).
- Default width for `side="right"`: `w-3/4 sm:max-w-sm` — 24rem max at sm+. Too narrow for full call
  detail (metadata + analysis + transcript). Will need overriding via `className` prop.
- Supports `side` prop: `"top" | "right" | "bottom" | "left"`.
- Overlay uses `bg-black/10` with backdrop blur — subtle.
- Exports: `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`,
  `SheetTitle`, `SheetDescription`.
- Usage pattern: wrap table in `<Sheet open={...} onOpenChange={...}>`, `SheetContent` for panel,
  `SheetTitle` for accessibility (required by base-ui Dialog for a11y).

**Width recommendation:** Override to `max-w-2xl` (672px) or `max-w-3xl` (768px) in `className` on
`SheetContent`. The call detail page is a 3-column grid (`lg:grid-cols-3`); in a panel at ~700px
this would render as stacked cards. That's acceptable.

### Call detail page — reusable content

**File:** `src/app/calls/[id]/page.tsx` (504 lines)

The call detail page renders four sections that should be replicated in the slide-out:
1. Page header (caller name, date/time, status badge, sentiment, flags, audit button)
2. Call Details card (from/agent/duration/direction/extension/portal ID)
3. AI Analysis card (summary, detailed summary, classification, tags, pest types, topics)
4. Transcript card (diarized speaker lines)
5. Processing Events card (pipeline event log)

For the slide-out panel, recommend **omitting Processing Events** (too technical for a quick-view
panel) and **omitting the Audit Call button** (requires full agent resolution flow). Keep sections
1-4.

All sub-components (MetaRow, SectionLabel, FlagChip, speakerColor, fmtDateTime) are defined inline
in the page file — they are not exported. Two approaches:

- **Approach A (recommended):** Extract a `CallDetailContent` component to
  `src/components/calls/call-detail-content.tsx` that accepts `CallDetailData` as a prop. Both the
  `/calls/[id]` page and the slide-out panel can use it.
- **Approach B:** Duplicate the rendering code into a slide-out panel component. Works but creates
  drift risk.

The `getCallDetail()` function in `src/lib/data/call-detail.ts` fetches all needed data. The
`CallDetailData` type is already exported.

### Recap page — current state

**File:** `src/app/recaps/page.tsx` (211 lines, single-file server component)

Current structure:
- Fetches up to 30 recaps from `daily_recaps`, ordered by `recap_date` DESC.
- Renders ALL recaps as full `RecapCard` components — no distinction between newest and older.
- Each `RecapCard` shows: KPI row (total calls, avg duration, sales opps, follow-ups), narrative
  (`summary_text`), category breakdown badges, top tags badges, agent breakdown badges, complaints alert.
- No collapsible behavior — all 30 recaps are fully expanded simultaneously.

**`Recap` type** includes: `summary_text` (plain text from Claude) but NOT `html_body` or
`plain_text_body`. The recap API route accepts `html_body` and `plain_text_body` but the page does
not query or use them. The page only renders `summary_text` as a plain text paragraph.

**Required structural changes (RECAP-02):**
1. Most recent recap → render at full size (existing `RecapCard` works as-is for this).
2. Remaining 29 recaps → collapsible rows. Collapsed state: date + one-line summary. Expanded:
   full `RecapCard`.
3. This requires `"use client"` because collapsible state requires `useState`.
4. Since the page is currently a server component, either:
   - Convert the entire page to client (fetch data via Server Action or API) — not recommended.
   - Extract a `RecapList` client component that receives all recaps as props and manages expand state.
   - **Recommended:** Keep server component for data fetch, pass `recaps` to a client `RecapHistory`
     component that renders the collapsible list (recaps[1..] — all except the first).

**One-line summary for collapsed row:** The `summary_text` field contains Claude's full narrative.
The collapsed row should show the first sentence or a truncation. Alternatively, derive the one-liner
from the stats: `"${recap_date} — ${total_calls} calls — ${top_category}"`. This is more reliable
than truncating the narrative (which may start with context, not a summary).

**Stats card gap:** The current `RecapCard` already has a 4-stat mini-grid (total calls, avg duration,
sales opps, follow-ups). CONTEXT.md requires: total calls, top category, key flags (bookings,
complaints, cancellations). The current stats row does not show `top_category` or `bookings_count`.
The `calls_by_category` JSONB field can derive top category. The `daily_recaps` table does not have
a `bookings_count` column (not in the Zod schema or `Recap` type). Bookings can be approximated from
`calls_by_category` if the n8n workflow stores it, or from the category "Scheduling" + "Rescheduling"
counts.

### Recap email / Claude prompt — current state

**The Claude recap prompt lives in n8n, not in this repository.**

From CLAUDE.md: The n8n "Pfitzer Pulse - Daily Recap Generator" workflow (ID: `n5bZW9UQico9plTS`)
contains a `Code - Build Prompt` node that constructs the Claude Haiku prompt. The prompt is not
stored in any file in this repo.

RECAP-01 changes (prompt improvements for geographic filler, WoW comparison, action items) require
editing that n8n workflow's `Code - Build Prompt` node directly in the n8n UI at
`automation.joystoneenterprises.com`.

**WoW comparison requirement:** The prompt must include the 7-day rolling average. The aggregate stats
node in the n8n workflow computes call counts per day. To compute a rolling average, the workflow
needs to query the last 7 days of data from Supabase. Currently it only queries the target date's
calls. The workflow will need an additional HTTP node to query Supabase for the rolling average, OR
the `/api/ingest/recap` data flow can be augmented to pre-compute the average before calling Claude.

**No codebase changes needed for RECAP-01** except potentially a new API endpoint or Supabase query
that the n8n workflow can call to get the 7-day rolling average count for inclusion in the prompt.
A simple Supabase RPC or a new GET route could serve this.

### Collapsible pattern — existing codebase reference

**File:** `src/components/audits/scorecard-accordion.tsx`

Pattern: `useState<Set<string>>` to track expanded section IDs. Toggle function adds/removes from
the Set. No external accordion library. Direct Tailwind conditional rendering. This same pattern
should be used for the collapsible recap history rows.

```typescript
// Pattern already in codebase:
const [expanded, setExpanded] = useState<Set<string>>(new Set())
function toggle(id: string) {
  setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}
```

---

## Architecture Patterns

### Slide-out panel — recommended component structure

```
src/
├── app/
│   └── dashboard/
│       └── page.tsx                    # Server component — fetches data, passes to RecentCallsTable
├── components/
│   ├── dashboard/
│   │   └── recent-calls-table.tsx      # NEW — "use client" — manages selectedCallId + Sheet state
│   └── calls/
│       └── call-detail-content.tsx     # NEW — renders metadata, analysis, transcript sections
└── lib/
    └── actions/
        └── call-detail.ts              # NEW — 'use server' wrapping getCallDetail()
```

### Recap page — recommended component structure

```
src/
└── app/
    └── recaps/
        └── page.tsx                    # Server component — fetch, pass [0] and [1..] to sub-components
                                        # RecapCard remains for the featured (first) recap
                                        # RecapHistory (NEW, "use client") for collapsible past recaps
```

### Data flow for slide-out panel

```
dashboard/page.tsx (server, fetches recentCalls)
  → props → RecentCallsTable (client)
    → row onClick → selectedCallId state update → Sheet opens
    → useEffect on selectedCallId → calls getCallDetailAction(id)
    → loading state → CallDetailContent renders with full data
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide-out drawer | Custom CSS panel | `Sheet` from `src/components/ui/sheet.tsx` | Already built on @base-ui/react, handles overlay, animation, portal, focus trap |
| Collapsible rows | External accordion library | `useState<Set<string>>` toggle pattern | Already established pattern in `scorecard-accordion.tsx` |
| Client-side data fetch in panel | `fetch()` to API route | Server Action wrapping `getCallDetail()` | Consistent with `runAudit` / `getAuditCallCount` patterns already in use |

---

## Common Pitfalls

### Pitfall 1: Server component page with client interactivity
**What goes wrong:** Adding `onClick` or `useState` directly to `src/app/dashboard/page.tsx` (a server
component) causes a build error.
**How to avoid:** Extract `RecentCallsTable` as a `"use client"` component. Keep the data fetch in the
server component. Pass `recentCalls: RecentCall[]` as a prop.

### Pitfall 2: Sheet default width is `sm:max-w-sm` (24rem)
**What goes wrong:** The default Sheet renders at 384px max width — too narrow to show call detail
with meaningful readability.
**How to avoid:** Pass `className="sm:max-w-2xl"` (or `sm:max-w-3xl`) to `SheetContent`. The w-3/4
percentage applies on small screens and is fine.

### Pitfall 3: SheetTitle is required for accessibility
**What goes wrong:** base-ui Dialog requires a title element for screen readers. Omitting `SheetTitle`
may produce a console warning or a11y violation.
**How to avoid:** Always include `<SheetTitle>` inside `<SheetContent>`, even if visually hidden.
Use caller name or "Call Detail" as the title.

### Pitfall 4: Recap collapsible needs client boundary but page is server
**What goes wrong:** Converting all of `recaps/page.tsx` to `"use client"` means Supabase service
role key cannot be used (client-side exposure risk).
**How to avoid:** Keep the server component for data fetch. Pass `recaps.slice(1)` to a
`RecapHistory` client component. Featured recap renders server-side.

### Pitfall 5: processing_status missing from RecentCall query
**What goes wrong:** Pending badge logic requires `processing_status`. It is not in the current
`getDashboardData()` SELECT or the `RecentCall` type.
**How to avoid:** Add `processing_status` to the SELECT string in `dashboard.ts` and to the
`RecentCall` type. Badge condition: `call.processing_status !== 'complete'`.

### Pitfall 6: One-line recap summary truncation
**What goes wrong:** `summary_text` starts with setup context, not a clean one-liner. Truncating
at N characters produces an arbitrary mid-sentence cut.
**How to avoid:** Derive the collapsed row text from structured data: 
`{formatDate(recap.recap_date)} — {recap.total_calls} calls — {topCategory}` where topCategory
is computed from `calls_by_category`.

---

## Code Examples

### Server Action for call detail fetch

```typescript
// src/lib/actions/call-detail.ts
'use server'
import { getCallDetail, type CallDetailData } from '@/lib/data/call-detail'

export async function getCallDetailAction(id: string): Promise<CallDetailData | null> {
  return getCallDetail(id)
}
```

### RecentCallsTable client component skeleton

```typescript
// src/components/dashboard/recent-calls-table.tsx
'use client'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getCallDetailAction } from '@/lib/actions/call-detail'
import type { RecentCall } from '@/lib/data/dashboard'
import type { CallDetailData } from '@/lib/data/call-detail'

export function RecentCallsTable({ calls }: { calls: RecentCall[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<CallDetailData | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRowClick(id: string) {
    setSelectedId(id)
    setLoading(true)
    const data = await getCallDetailAction(id)
    setDetail(data)
    setLoading(false)
  }

  return (
    <>
      <table className="w-full text-sm">
        {/* ...thead... */}
        <tbody>
          {calls.map((call) => (
            <tr
              key={call.id}
              onClick={() => handleRowClick(call.id)}
              className="cursor-pointer border-b hover:bg-muted/20 ..."
            >
              {/* ...cells... */}
            </tr>
          ))}
        </tbody>
      </table>

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.from_name ?? detail?.from_number ?? 'Call Detail'}</SheetTitle>
          </SheetHeader>
          {loading && <p className="p-4 text-sm text-muted-foreground">Loading...</p>}
          {detail && !loading && <CallDetailContent call={detail} />}
        </SheetContent>
      </Sheet>
    </>
  )
}
```

### Pending badge logic for agent/category cells

```typescript
// Inside RecentCallsTable row render
const isPending = call.processing_status !== 'complete'

// Agent cell:
<td>
  {isPending && !call.agent_name_inferred
    ? <Badge variant="secondary" className="text-xs text-muted-foreground">Pending</Badge>
    : call.agent_name_inferred ?? '—'}
</td>

// Category cell:
<td>
  {isPending && !call.primary_category
    ? <Badge variant="secondary" className="text-xs text-muted-foreground">Pending</Badge>
    : call.primary_category
      ? <Badge variant="secondary">{call.primary_category}</Badge>
      : <span className="text-muted-foreground text-xs">—</span>}
</td>
```

### Recap collapsible history component skeleton

```typescript
// Inside recaps/page.tsx or extracted component
'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function RecapHistory({ recaps }: { recaps: Recap[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-1">
      {recaps.map((recap) => {
        const isExpanded = expanded.has(recap.id)
        const topCategory = recap.calls_by_category
          ? Object.entries(recap.calls_by_category).sort(([,a],[,b]) => b-a)[0]?.[0]
          : null
        const summary = `${formatDate(recap.recap_date)} — ${recap.total_calls ?? 0} calls${topCategory ? ` — ${topCategory}` : ''}`

        return (
          <div key={recap.id} className="rounded-lg border">
            <button
              onClick={() => toggle(recap.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30"
            >
              <span>{summary}</span>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {isExpanded && <RecapCard recap={recap} />}
          </div>
        )
      })}
    </div>
  )
}
```

---

## Open Questions

1. **WoW comparison data source for RECAP-01**
   - What we know: The n8n recap workflow queries Supabase for the target date's calls only.
   - What's unclear: Whether the planner should include a task to add a 7-day aggregate query
     to the n8n workflow, or whether this is out of Phase 3 scope (n8n changes vs. Next.js changes).
   - Recommendation: Treat n8n prompt improvements as a single task: "Update Code - Build Prompt
     node in n8n recap workflow." Include WoW average in scope by adding a Supabase HTTP call in
     n8n to fetch the last 7 days' call counts.

2. **`bookings_count` in recap stats card**
   - What we know: The `daily_recaps` table does not have a `bookings_count` column. The `Recap`
     type has no such field. The CONTEXT.md requires "key flags (bookings, complaints, cancellations)"
     in the stats card.
   - What's unclear: Whether "bookings" means calls with `booking_made = true` (aggregated by n8n)
     or can be approximated from categories.
   - Recommendation: Approximate using category counts already in `calls_by_category` JSONB. Show
     "Scheduling" + "Rescheduling" combined as a booking proxy. This avoids requiring a DB migration.
     Flag in plan task that this is an approximation.

3. **Sheet `onOpenChange` API in base-ui**
   - What we know: The Sheet is built on `@base-ui/react` Dialog with `SheetPrimitive.Root`.
   - What's unclear: Whether `onOpenChange` prop signature matches standard Radix UI (`(open: boolean) => void`) or differs.
   - Recommendation: Confirm by checking `@base-ui/react` Dialog.Root prop types before implementing.
     The `open` + `onOpenChange` pattern is standard but base-ui may use `defaultOpen` differently.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files listed below

### Files Inspected
| File | Key Finding |
|------|-------------|
| `src/app/dashboard/page.tsx` | Server component, 20-row Recent Calls table, no client interactivity |
| `src/lib/data/dashboard.ts` | `RecentCall` type lacks `processing_status`; SELECT query to extend |
| `src/app/recaps/page.tsx` | All recaps rendered as full cards, no collapse, server component |
| `src/app/api/ingest/recap/route.ts` | Recap schema: accepts `html_body`, `summary_text`; no `bookings_count` |
| `src/components/ui/sheet.tsx` | Sheet exists on `@base-ui/react`; default max-w-sm needs override |
| `src/app/calls/[id]/page.tsx` | Full call detail structure; inline sub-components need extraction |
| `src/lib/data/call-detail.ts` | `getCallDetail()` and `CallDetailData` type — ready for Server Action wrapper |
| `src/lib/actions/audit.ts` | Server Action pattern: `'use server'` + service client |
| `src/components/audits/scorecard-accordion.tsx` | Collapsible pattern: `useState<Set<string>>` toggle |
| `src/lib/api/schemas.ts` | `processingStatusSchema` — `'complete'` is the fully-analyzed status |

---

## Metadata

**Confidence breakdown:**
- Component structure: HIGH — direct file inspection
- Sheet behavior: MEDIUM — base-ui Dialog prop API not verified against current @base-ui/react docs; 1 open question
- n8n prompt changes: HIGH — confirmed in CLAUDE.md that prompt lives in n8n, not codebase
- Recap data shape: HIGH — confirmed from Zod schema and Supabase type stubs

**Research date:** 2026-06-04
**Valid until:** Stable (codebase changes would invalidate; no external library uncertainty)
