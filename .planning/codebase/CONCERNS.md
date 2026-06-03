# Codebase Concerns

**Analysis Date:** 2026-06-03

---

## Tech Debt

**Database types are stubs, not generated:**
- Issue: `src/lib/supabase/types.ts` uses `Record<string, unknown>` for every table row/insert/update type. The Supabase CLI can generate accurate TypeScript types from the live schema but has not been run.
- Files: `src/lib/supabase/types.ts`
- Impact: No compile-time safety on any Supabase query. All data layer files (`src/lib/data/*.ts`, all route handlers) use `as string`, `as Record<string, unknown>`, etc. throughout — 110+ type assertion sites. Mismatched field names silently return `undefined` at runtime.
- Fix approach: Run `npx supabase gen types typescript --project-id jdoatvotmsmhrmpitzon > src/lib/supabase/types.ts` and remove the manual stubs. Requires Supabase CLI installed.

**Pervasive runtime type casting instead of typed queries:**
- Issue: Because DB types are stubs, every data layer function casts query results manually: `(row as Record<string, unknown>).field as string`. This is spread across `src/lib/data/audits.ts`, `src/lib/data/calls.ts`, `src/lib/data/dashboard.ts`, `src/lib/data/call-detail.ts`, and `src/app/api/audit/run/route.ts`.
- Files: `src/lib/data/audits.ts` (21 cast sites), `src/lib/data/call-detail.ts` (45), `src/lib/data/calls.ts` (16), `src/app/api/audit/run/route.ts` (20)
- Impact: Bugs from renamed or nullable columns will not surface until runtime. Makes refactoring high-risk.
- Fix approach: Resolve after DB types are generated (see above). Replace `as Record<string, unknown>` patterns with typed destructuring.

**`unstable_noStore` is deprecated API:**
- Issue: All data layer functions call `import { unstable_noStore as noStore } from "next/cache"`. The `unstable_` prefix indicates this is a non-stable Next.js API that may change without warning.
- Files: `src/lib/data/dashboard.ts:2`, `src/lib/data/calls.ts:2`, `src/lib/data/call-detail.ts:2`, `src/lib/data/audits.ts:2`, `src/app/audits/page.tsx:1`, `src/app/recaps/page.tsx:1`
- Impact: Could break on Next.js upgrade. Current project uses Next.js 16.2.7 (very recent), so low immediate risk but will need attention.
- Fix approach: Replace with `import { noStore } from "next/cache"` when the stable API is available, or use `{ cache: 'no-store' }` on fetch calls.

**`mock-data.ts` remains in the codebase:**
- Issue: `src/lib/mock-data.ts` contains hardcoded fake call records with real agent names (Karen Kieffer, Ashley Terhark, Jil Traxinger). The file is no longer imported by any production code but is not deleted.
- Files: `src/lib/mock-data.ts`
- Impact: Dead code, risk of accidental re-introduction. Contains identifiable names that constitute unnecessary PII if ever logged or committed somewhere more public.
- Fix approach: Delete the file.

**Calls page loads all records without pagination at the data layer:**
- Issue: `src/lib/data/calls.ts` — `getCalls()` performs `.select(...).order("call_time_ct", { ascending: false })` with no `.limit()` clause. All call records are loaded into memory server-side, then passed to the `CallExplorer` client component which handles pagination in-browser.
- Files: `src/lib/data/calls.ts:23-63`, `src/components/calls/call-explorer.tsx`
- Impact: At ~30-70 calls/day × 365 days of historical data = potential 10,000-25,000 rows fetched on every page load. Will degrade page load time and memory use as data grows.
- Fix approach: Move pagination server-side. Accept `page` and `pageSize` URL params in the calls page, pass to a paginated `getCalls(page, pageSize)` that uses `.range()` on the Supabase query.

**`calls` table queried without `processing_status = 'complete'` filter on dashboard and calls list:**
- Issue: `getDashboardData()` in `src/lib/data/dashboard.ts` and `getCalls()` in `src/lib/data/calls.ts` query all calls regardless of processing status. Calls stuck in intermediate states (`metadata_saved`, `transcribing`, `failed`) appear in all views.
- Files: `src/lib/data/dashboard.ts:73-99`, `src/lib/data/calls.ts:26-36`
- Impact: KPI counts, recent calls list, and call explorer include partial or failed pipeline records. Complaint counts and follow-up counts may include noise from incomplete processing.
- Fix approach: Add `.eq('processing_status', 'complete')` to dashboard KPI queries and optionally to the calls list (or expose as a filter toggle).

**Agent-to-call linkage relies on fuzzy name matching:**
- Issue: Calls are matched to agents via `agent_name_inferred` text field on the `calls` table, which is populated by Claude's AI inference from the transcript. The audit run route uses `.ilike('agent_name_inferred', '${agentDisplayName}%')` for date-range lookups. The `calls.agent_id` foreign key is never populated by the pipeline.
- Files: `src/app/api/audit/run/route.ts:106-108`, `src/app/api/audit/call-count/route.ts:16-19`
- Impact: Agent name misspellings, partial matches, or inference errors silently exclude calls from audits or include wrong-agent calls. Audits for agents with similar first names (e.g. "Karen" vs "Karen K.") may cross-contaminate.
- Fix approach: Populate `calls.agent_id` in the pipeline by matching `agent_name_inferred` against the `agents` table at analysis ingestion time. Then audit queries can use the FK instead of the text match.

---

## Security Considerations

**`/api/audit/run` and `/api/audit/call-count` have no authentication:**
- Risk: These routes are callable by any unauthenticated HTTP request with no bearer token check. `/api/audit/run` triggers live Anthropic API calls at ~$0.009/call × up to 25 calls = ~$0.225 per request. Any actor who discovers the endpoint can run arbitrary audits against the database and incur API costs.
- Files: `src/app/api/audit/run/route.ts:27`, `src/app/api/audit/call-count/route.ts:5`
- Current mitigation: None. The CLAUDE.md notes auth was removed in Chunk 12 ("auth not yet implemented"). The ingest routes use `validateIngestAuth()` but the audit routes do not.
- Recommendations: Add `validateIngestAuth()` guard to both routes as a minimum. Long term, guard with Supabase session auth once the auth chunk is implemented.

**Authentication is fully disabled on all dashboard routes:**
- Risk: The entire application — dashboard, calls, transcripts, audits, recaps — is publicly accessible with no login required. The `proxy.ts` middleware has the redirect logic commented out.
- Files: `src/proxy.ts:44-51`
- Current mitigation: Security through obscurity only (non-public Vercel URL).
- Recommendations: Uncomment and activate the auth redirect in `proxy.ts` once a `/login` page exists. This is a known planned chunk (CLAUDE.md: "TODO (Chunk auth)").

**Non-null assertions on environment variables:**
- Risk: `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `process.env.SUPABASE_SERVICE_ROLE_KEY!` are used with TypeScript non-null assertion throughout. A misconfigured deployment (missing env var) will throw a runtime error rather than a helpful startup failure.
- Files: `src/lib/supabase/server.ts:31-33,57-58`, `src/proxy.ts:19-20`
- Current mitigation: Vercel env vars are configured and validated in the project settings.
- Recommendations: Add an explicit startup check that validates required env vars are present and non-empty, logging a clear error before the service crashes.

---

## Performance Bottlenecks

**`/api/audit/run` will exceed Vercel's 60-second function timeout with large call sets:**
- Problem: The route is capped at `maxDuration = 60` (line 11). Scoring 25 calls requires 5 sequential batches of 5 concurrent Claude API calls. Each Claude Haiku call takes 2-8 seconds. A 25-call audit can take 30-60+ seconds and occasionally exceeds the limit.
- Files: `src/app/api/audit/run/route.ts:11,212-219`
- Cause: All scoring happens synchronously in a single request/response cycle. The Vercel Hobby/Pro function timeout is 60 seconds.
- Improvement path: Move audit scoring to an async background job. Options: (1) Vercel background functions with a polling endpoint, (2) trigger an n8n workflow for scoring, (3) use Vercel's `waitUntil` with a status-polling UI.

**`getDashboardData()` fires 5 concurrent Supabase queries on every page load:**
- Problem: The dashboard page has no caching — `noStore()` is called unconditionally, forcing a full 5-query Supabase round-trip on every visit. This is appropriate for live data but makes the page slow for users who navigate away and return frequently.
- Files: `src/lib/data/dashboard.ts:54-100`
- Cause: Intentional design for real-time accuracy, but with no ISR or stale-while-revalidate option.
- Improvement path: Switch to `revalidate = 300` (5-minute cache) since call data is only ingested once daily. Dashboard accuracy within 5 minutes is sufficient.

---

## Fragile Areas

**Supabase join shape inconsistency (array vs. object):**
- Why fragile: Supabase JS v2 returns joined tables as either an array or a single object depending on FK relationship detection. The codebase has defensive code for this in multiple places using `Array.isArray(ct) ? ct[0] : ct` patterns.
- Files: `src/app/api/audit/run/route.ts:143-146,178-181`, `src/lib/data/audits.ts:64-65,105-106`, `src/lib/data/calls.ts:45`, `src/lib/data/call-detail.ts:115-118`
- Safe modification: Always include both array and object handling branches when writing new join queries. After DB types are generated, the Supabase client will return predictable shapes and this defensive code can be simplified.
- Test coverage: Not tested — only production behavior has validated which shape Supabase returns.

**Claude JSON extraction uses fragile regex:**
- Why fragile: Both the audit scoring and synthesis paths extract JSON from Claude's response using `raw.match(/\{[\s\S]*\}/)`. If Claude wraps its response in extra text containing `{` characters, or returns nested objects, the regex extracts incorrectly. There is no schema validation of the extracted JSON.
- Files: `src/app/api/audit/run/route.ts:197-203,245-252`
- Safe modification: Use Claude's structured output (tool use / JSON mode) or at minimum validate the extracted JSON against a Zod schema before using it. The `CriterionResultSchema.safeParse()` on line 205-207 provides some protection for individual criteria but the outer `{ criteria: unknown[] }` cast on line 203 is unguarded.
- Test coverage: `src/lib/audit-prompt.test.ts` and `src/lib/audit-scoring.test.ts` test the scoring logic but not Claude response parsing.

**Audit score persistence is not transactional:**
- Why fragile: In `src/app/api/audit/run/route.ts`, the audit record is created first (step 4), then scores are inserted (step 8), then the audit is updated to `complete` (step 9). If the scores insert fails, the audit record is updated to `failed` in the catch block — but partial score rows may already be committed to `call_quality_scores`. A retry would create duplicate score rows since there is no `onConflict` handling on the scores insert.
- Files: `src/app/api/audit/run/route.ts:254-294`
- Safe modification: Wrap score insertion and audit completion in a Supabase RPC (database function) to make it atomic, or add a `UNIQUE(audit_id, call_id, rubric_criterion_id)` constraint and use `onConflict: 'do nothing'` on the scores upsert.

**`/api/ingest/analysis` denorm update is non-fatal but silent on failure:**
- Why fragile: After writing to `call_analysis`, the route updates denormalized fields on the `calls` table (including `processing_status = 'complete'`). If this update fails, it is logged but the route returns 200 OK. The call will never reach `complete` status and will be excluded from audit queries.
- Files: `src/app/api/ingest/analysis/route.ts:93-111`
- Safe modification: Consider returning a warning flag in the response body when the denorm update fails, so n8n can log or alert on it.

---

## Missing Critical Features

**No authentication / login flow:**
- Problem: All pages are publicly accessible. CLAUDE.md identifies this as a planned "Chunk auth" item.
- Blocks: Cannot safely share the Vercel URL with Karen or Garret until protected. Cannot use Supabase RLS user-scoped policies.

**Settings page is empty:**
- Problem: `src/app/settings/page.tsx` renders a placeholder with "Coming in later chunks".
- Blocks: No way for Karen or Garret to manage agent records, update email recipients for recaps, or configure category lists without direct Supabase dashboard access.

**Trends page is a stub:**
- Problem: `src/app/trends/page.tsx` renders a placeholder.
- Blocks: Historical trend analysis (pest activity spikes, complaint patterns, agent performance over time) is unavailable in the UI.

**n8n workflows are manually date-locked and inactive:**
- Problem: Both the Nightly Call Ingestion workflow and the Daily Recap Generator are inactive, with `targetDate` hardcoded to a test date (per CLAUDE.md). Activating them requires manually editing the Code - Config node.
- Blocks: No new call data is flowing in automatically.

---

## Test Coverage Gaps

**All API routes are untested:**
- What's not tested: `src/app/api/ingest/call/route.ts`, `src/app/api/ingest/transcript/route.ts`, `src/app/api/ingest/analysis/route.ts`, `src/app/api/ingest/recap/route.ts`, `src/app/api/processing/event/route.ts`, `src/app/api/audit/run/route.ts`, `src/app/api/audit/call-count/route.ts`
- Risk: Auth bypass, malformed Zod validation, Supabase write errors, and Claude parsing failures are only discoverable in production.
- Priority: High — the ingest routes are the critical data pipeline path.

**All data layer functions are untested:**
- What's not tested: `src/lib/data/dashboard.ts`, `src/lib/data/calls.ts`, `src/lib/data/call-detail.ts`, `src/lib/data/audits.ts`
- Risk: Query logic changes (filters, joins, ordering) break silently.
- Priority: Medium — these are pure data fetchers; mocking Supabase is nontrivial but integration tests against a test DB are feasible.

**Claude response parsing is untested:**
- What's not tested: The regex JSON extraction in `src/app/api/audit/run/route.ts:197-203` and `245-252`.
- Risk: If Claude changes response formatting or wraps JSON in markdown code fences, audits silently produce empty scores.
- Priority: High — add unit tests that cover malformed Claude responses (no JSON, multiple JSON objects, JSON in markdown fence).

**`parseTranscript` is untested:**
- What's not tested: `src/lib/data/call-detail.ts:64-74` — the regex that splits diarized transcript text into speaker/text pairs.
- Risk: Transcript lines not matching `[Speaker N]: text` format (e.g., blank lines, special characters) produce `{ speaker: "Unknown", text: line }` silently.
- Priority: Low — behavior is tolerable but edge cases are unknown.

---

*Concerns audit: 2026-06-03*
