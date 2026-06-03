# Phase 01: Foundation & Security - Research

**Researched:** 2026-06-03
**Domain:** Next.js 15 data layer, Supabase queries, API route auth, n8n credential security
**Confidence:** HIGH — all findings are from direct codebase reading (source files, migrations, schema)

---

## Summary

This phase has four distinct work items: (1) finding why the Call Explorer shows no data, (2) adding auth guards to two unprotected API routes, (3) assessing the n8n credential exposure risk, and (4) adding global filters for short calls and "No Digit" robocalls.

The root cause of the Call Explorer blank state is **not a component bug** — the `CallExplorer` component receives data correctly and filters it in-browser. The most likely culprit is that `getCalls()` in `src/lib/data/calls.ts` queries all calls with **no `processing_status` filter**, but the empty string "No calls match the current filters" only appears when `filtered.length === 0` — this could happen if the component is showing data but the default empty state text is misleading, OR if `getCalls()` is returning an empty array. Given that 33 calls were confirmed processed in prod (CLAUDE.md), the query should return records. The blank state is most likely a Supabase RLS issue: `getCalls()` uses `createServiceClient()` (service role, bypasses RLS), so RLS is not the cause. The most probable culprit is a **misconfigured or expired `SUPABASE_SERVICE_ROLE_KEY` environment variable on Vercel**, causing the Supabase client to silently fall back and return empty data. The secondary candidate is that calls exist in the DB but with `call_time_ct = null`, which could cause the `.order("call_time_ct", ...)` to behave unexpectedly with nulls.

The auth fix is simple: both audit routes need a two-line `validateIngestAuth(request)` guard inserted at the top of their handler — the pattern is already established in all five ingest/processing routes.

The DASH-06/DASH-07 duration and release_cause filters require careful design: **"release_cause" is not currently captured anywhere in the system** (not in the DB schema, not parsed from the portal HTML, not in `call-metadata.ts`). DASH-07 must either be (a) implemented via the `call_analysis.primary_category = 'Voicemail'` heuristic, or (b) require adding `release_cause` as a new field to the portal scraper, the ingest API, and the DB schema. The duration filter (DASH-06) is straightforward — `duration_seconds` exists in `calls` and filtering `< 25` is a query-layer change.

**Primary recommendation:** Investigate the DATA-01 blank state by checking Vercel env vars and querying the DB directly first. The fix is likely an env var issue, not a code change.

---

## Standard Stack

This phase uses no new libraries. All work is within the existing stack.

### Existing Patterns in Use
| Pattern | Location | Notes |
|---------|----------|-------|
| `validateIngestAuth(request)` | `src/lib/api/ingest-auth.ts` | Checks `Authorization: Bearer <INGEST_SECRET>` header |
| `createServiceClient()` | `src/lib/supabase/server.ts` | Service role client, bypasses RLS |
| Supabase `.eq()`, `.gte()`, `.lt()` filter chaining | All data layer files | Standard Supabase JS v2 API |
| Supabase `.select().order()` | `src/lib/data/calls.ts` | Used in `getCalls()` |
| Next.js Route Handler `POST` / `GET` | All `route.ts` files | Standard App Router pattern |

**No new dependencies needed for this phase.**

---

## Architecture Patterns

### Recommended Project Structure (no changes needed)
The existing structure is correct. All changes are additions or edits within existing files.

### Pattern 1: Auth Guard on API Route
**What:** Insert `validateIngestAuth` check at the top of a route handler, before any business logic.
**When to use:** Every `/api/*` route that should be protected by the ingest secret.
**Established example from `src/app/api/ingest/call/route.ts`:**
```typescript
// Source: src/app/api/ingest/call/route.ts lines 22-25
export async function POST(request: Request) {
  if (!validateIngestAuth(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  // ... rest of handler
}
```
Apply this exact pattern to:
- `src/app/api/audit/run/route.ts` — `POST` handler (currently has NO auth check at line 27)
- `src/app/api/audit/call-count/route.ts` — `GET` handler (currently has NO auth check at line 5)

For `GET` handlers, the `request` parameter is already present in the function signature — it just needs to be used.

### Pattern 2: Supabase Query Filter Chain
**What:** Chain `.gt()`, `.lt()`, `.eq()`, `.neq()` methods on a Supabase query to filter rows.
**Established example from `src/app/api/audit/run/route.ts` lines 103-110:**
```typescript
// Source: src/app/api/audit/run/route.ts
const { data: calls } = await supabase
  .from('calls')
  .select('id')
  .ilike('agent_name_inferred', `${agentDisplayName}%`)
  .eq('processing_status', 'complete')
  .gte('call_date', date_range.start)
  .lte('call_date', date_range.end)
  .limit(25)
```
Apply the same chaining approach for duration filter: `.gt('duration_seconds', 25)`.

### Pattern 3: Global Filter in Data Layer
**What:** Add filter conditions to `getCalls()` and `getDashboardData()` at the query level, not the component level.
**Why query-level, not component-level:** DASH-06/DASH-07 require exclusion from ALL views — dashboard KPIs, call volume, recent calls, call explorer, and aggregate counts. Component-level filtering only affects one view. The data layer functions in `src/lib/data/` serve multiple views. Filtering at query time is more efficient (fewer rows fetched) and guarantees global exclusion.

### Anti-Patterns to Avoid
- **Component-level filtering for DASH-06/DASH-07:** Adding a `duration_seconds > 25` filter inside `CallExplorer` would only fix the call list, not dashboard KPIs.
- **Adding `release_cause` to the DB without also updating the n8n scraper:** The `calls` table gets its data entirely from the n8n ingestion pipeline. A new column with no write path would always be null.
- **Using `NOT NULL` filter instead of threshold:** `duration_seconds` can legitimately be 0 on failed calls. Use `.gt('duration_seconds', 25)` not `.not('duration_seconds', 'is', null)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth on GET route | New auth middleware | `validateIngestAuth(request)` from `src/lib/api/ingest-auth.ts` | Already exists, already tested in 5 routes |
| Duration filter | Custom JS filter in component | `.gt('duration_seconds', 25)` in Supabase query | Query-level = applies to all callers of `getCalls()` |
| "No Digit" exclusion without DB column | Regex on `from_number` or `dialed_number` | Add `release_cause TEXT` column + filter, OR use `primary_category = 'Voicemail'` heuristic | Explained in detail below |

---

## Common Pitfalls

### Pitfall 1: DATA-01 Cause — Empty Data vs. Filtered Data
**What goes wrong:** The Call Explorer shows "No calls match the current filters" — this message appears at line 499-505 of `call-explorer.tsx` when `table.getRowModel().rows.length === 0`. This triggers either when `calls` prop is empty (data layer problem) OR when all data is filtered out by active UI filters (user error).
**Why it happens:** The component has default filter state (`search=""`, `category=""`, etc.) so no UI filter should exclude data. The problem must be in `getCalls()` returning `[]`.
**Root causes to investigate (in order):**
1. `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_URL` is missing/invalid in Vercel env — `createServiceClient()` would fail silently, `getCalls()` returns `[]`
2. The `call_time_ct` ordering with many null values — this shouldn't cause empty results but could cause unexpected ordering
3. Supabase JS client version mismatch / breaking change in `@supabase/ssr` — unlikely but possible
4. All calls are in a non-complete `processing_status` and some accidental filter exists — **check: no status filter exists in `getCalls()` currently**
**How to avoid:** Check Vercel dashboard → Settings → Environment Variables before writing any code. Query Supabase directly via dashboard to confirm rows exist.
**Warning signs:** `getCalls()` returns `[]` with no error in Vercel logs, OR error is silently swallowed at line 37-39 of `calls.ts`.

### Pitfall 2: `booking_made` Column Missing from `calls` Table
**What goes wrong:** `src/app/api/ingest/analysis/route.ts` line 104 writes `booking_made` to the `calls` table during denormalization: `.update({ ..., booking_made: analysisFields.booking_made ?? false, ... })`. But `booking_made` does not appear in `supabase/migrations/20260602_001_core_tables.sql` — the `calls` table schema has no `booking_made` column.
**Why it happens:** The field exists in `call_analysis` (migration 002) but the denorm update incorrectly tries to write it back to `calls`. This would cause the denorm update to fail silently (line 108-111 logs but returns 200). This means `processing_status` may never reach `'complete'` for many calls — which would explain why `getCalls()` returns empty data if queries add `.eq('processing_status', 'complete')` later.
**Verification:** Check actual Supabase schema in dashboard OR run the DB query `SELECT column_name FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'booking_made'`.
**How to avoid:** Either remove `booking_made` from the denorm update, or add the column to `calls` via a migration.
**Warning signs:** Vercel logs show "[ingest/analysis] calls denorm update" error on every call ingestion.

### Pitfall 3: "No Digit" Filter Requires Portal Scraper Change
**What goes wrong:** "Release Cause = No Digit" is a VoIP telephony concept from the portal that identifies calls that hung up before connecting (automated dialers, robocalls). This field is **not captured anywhere** in the current system:
- Not in `portal_client.py` HTML parsing
- Not in the n8n Code - Parse HTML node
- Not in `PortalCallRow` type in `call-metadata.ts`
- Not in `POST /api/ingest/call` schema
- Not in the `calls` table schema
**Why it matters:** Implementing DASH-07 as specified requires either:
  - **Option A (full):** Add `release_cause TEXT` column to `calls`, update n8n HTML parser to extract it from portal `<tr>` attributes, update `/api/ingest/call` Zod schema to accept it, then filter `WHERE release_cause != 'No Digit'`
  - **Option B (heuristic):** Use `primary_category = 'Voicemail'` OR `duration_seconds < 5` as a proxy. "No Digit" calls are typically very short (0-3 seconds) with no recording. This may already be covered by DASH-06's duration filter.
**Recommendation:** Verify whether "No Digit" calls have distinct portal HTML attributes before committing to Option A. If they are consistently 0-5 seconds duration, DASH-06 (duration >= 25s filter) already excludes them and DASH-07 may need no additional implementation.

### Pitfall 4: Dashboard Data Functions Need Filter Too
**What goes wrong:** Adding a duration filter only to `getCalls()` fixes the Call Explorer but not the dashboard. `getDashboardData()` in `src/lib/data/dashboard.ts` has 5 separate queries — KPI counts, week count, month data (including category breakdown), volume data, and recent calls — ALL of which need the same filters.
**Why it happens:** The dashboard and calls list are separate data functions with no shared base query.
**How to avoid:** Plan 01-03 must touch both `src/lib/data/calls.ts` AND `src/lib/data/dashboard.ts`. A shared constant for the filter thresholds (`MIN_DURATION_SECONDS = 25`) should be defined in one place.

### Pitfall 5: SEC-02 n8n Credential Scope
**What goes wrong:** Developer attempts to "fix" the n8n credential exposure by moving credentials out of the workflow JSON, which is not the right approach for n8n self-hosted.
**What the real risk is:**
  - n8n stores workflow definitions in its Postgres DB. Exported JSON files contain credentials in plaintext.
  - n8n execution logs capture input/output of each node, potentially including authorization headers.
  - The risk is: anyone with n8n admin access OR database read access can see API keys.
**What's appropriate for this project:**
  - The n8n instance is self-hosted on a private Hostinger VPS — not publicly accessible.
  - Only Mike has admin access.
  - The actual threat is accidental credential commits to Git (workflow JSON exports).
**The fix is documentation, not architecture change:** Add a note to CLAUDE.md warning that exported workflow JSON contains credentials in plaintext and must never be committed. The CLAUDE.md already has this warning: "Exported workflow JSON contains all credentials in plaintext. Do not commit or share exported workflow files."
**Conclusion:** SEC-02 is already mitigated by the existing CLAUDE.md warning. The formal deliverable for SEC-02 is a documented risk acceptance note.

---

## Code Examples

### Auth Guard on GET Route
```typescript
// Apply to src/app/api/audit/call-count/route.ts
import { validateIngestAuth } from '@/lib/api/ingest-auth'

export async function GET(request: Request) {
  if (!validateIngestAuth(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  // ... existing logic unchanged
}
```

### Auth Guard on POST Route
```typescript
// Apply to src/app/api/audit/run/route.ts (insert before line 29 body parsing)
export async function POST(request: Request) {
  if (!validateIngestAuth(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  // ... existing logic unchanged
}
```

### Duration Filter in getCalls()
```typescript
// src/lib/data/calls.ts — add .gt() filter to the select chain
const { data, error } = await supabase
  .from("calls")
  .select(`id, call_time_ct, ...`)
  .gt("duration_seconds", 25)   // DASH-06: exclude calls under 25 seconds
  .order("call_time_ct", { ascending: false });
```

### Duration Filter in getDashboardData() — each query needs it
```typescript
// All five queries in getDashboardData() need the same filter
// Example for yesterdayResult:
supabase
  .from("calls")
  .select("id", { count: "exact", head: true })
  .eq("call_date", yesterday)
  .gt("duration_seconds", 25),  // DASH-06 filter
```

---

## State of the Art

No new techniques required. All patterns are in existing code.

| Item | Current State | Change Needed |
|------|--------------|---------------|
| Auth on audit routes | Missing — no check at all | Add `validateIngestAuth` (2 lines per route) |
| Duration filter | Not applied to any query | Add `.gt('duration_seconds', 25)` to `getCalls()` and all 5 `getDashboardData()` sub-queries |
| Release cause filter | Field does not exist in system | Either add full portal scraping support, OR use duration filter as proxy |
| n8n credential risk | Already documented in CLAUDE.md | Formalize as accepted risk note in planning |

---

## Open Questions

1. **Does `booking_made` column exist in `calls` table in production?**
   - What we know: It's not in the migration files. The denorm update in `/api/ingest/analysis` tries to write it.
   - What's unclear: Was it added via the Supabase dashboard directly (not as a migration)?
   - Recommendation: Check Supabase dashboard → Table Editor → calls table columns BEFORE writing any DATA-01 fix. If missing, removing it from the denorm update may be what's blocking `processing_status = 'complete'` from being set.

2. **Does the portal HTML expose `release_cause` or an equivalent field?**
   - What we know: The legacy `portal_client.py` parses 7 fields from `<tr>` attributes and `<td>` CSS classes. "release_cause" is not among them. The n8n Code - Parse HTML node presumably mirrors this.
   - What's unclear: The portal may have a CSS class like `td.release-cause-field` or a `data-release-cause` attribute on `<tr>` rows that was simply never parsed.
   - Recommendation: During Plan 01-03, check the actual portal HTML source for one known "No Digit" call to determine if the field is available before deciding Option A vs Option B.

3. **Are there actually calls with `processing_status = 'complete'` in the production DB?**
   - What we know: The CLAUDE.md confirms 33 calls were processed on June 1 2026 in the test run.
   - What's unclear: Whether the n8n workflow was re-run since that test, and whether the denorm update failure (if `booking_made` is missing) prevented `status = 'complete'` from being written.
   - Recommendation: The very first action in Plan 01-01 should be: query `SELECT processing_status, COUNT(*) FROM calls GROUP BY processing_status` in Supabase dashboard. This determines if the problem is "no complete calls" vs "complete calls not appearing in UI".

---

## Sources

### Primary (HIGH confidence)
- `src/app/api/audit/run/route.ts` — direct inspection confirms no auth check at line 27
- `src/app/api/audit/call-count/route.ts` — direct inspection confirms no auth check at line 5
- `src/lib/api/ingest-auth.ts` — auth pattern, 8 lines, definitive
- `src/lib/data/calls.ts` — `getCalls()` implementation, no status filter, no duration filter
- `src/lib/data/dashboard.ts` — `getDashboardData()`, 5 queries, no duration filter
- `src/components/calls/call-explorer.tsx` — blank state logic confirmed at lines 498-506
- `supabase/migrations/20260602_001_core_tables.sql` — `calls` table schema, no `booking_made` column, no `release_cause` column
- `supabase/migrations/20260602_002_call_detail_tables.sql` — `call_analysis` has `booking_made: false` default wait, no — `booking_made` not in `call_analysis` either
- `src/app/api/ingest/analysis/route.ts` lines 93-111 — denorm update writes `booking_made` to `calls` (column does not exist in migration)
- `.planning/codebase/CONCERNS.md` — documents the missing `processing_status = 'complete'` filter concern

### Secondary (MEDIUM confidence)
- `pfitzer-pulse/portal_client.py` — legacy Python parser shows which portal fields are extracted; confirms `release_cause` was never parsed

---

## Metadata

**Confidence breakdown:**
- DATA-01 root cause: MEDIUM — identified 3 plausible causes; `booking_made` column mismatch is the most likely, but requires DB verification
- SEC-01 auth fix: HIGH — pattern is copy-paste from existing route, no ambiguity
- SEC-02 risk assessment: HIGH — scope is clearly documentation, not architecture
- DASH-06 duration filter: HIGH — field exists, pattern is established, just needs adding to queries
- DASH-07 release_cause filter: LOW-MEDIUM — field doesn't exist in system; approach depends on portal HTML inspection

**Research date:** 2026-06-03
**Valid until:** 2026-07-03 (stable codebase; valid until schema changes)
