---
phase: 01-foundation-and-security
plan: 01
subsystem: database
tags: [supabase, data-layer, call-explorer, bug-fix, typescript]

requires: []
provides:
  - getCalls() correctly returns short_summary for all complete calls
  - call-detail.ts correctly unpacks one-to-one FK joins (call_analysis, call_transcripts)
  - Confirmed DB state: 63 complete calls, 105 metadata_saved (no recording — by design)
affects: [all pages that read from calls table via data layer]

tech-stack:
  added: []
  patterns:
    - "Supabase one-to-one FK joins return objects not arrays — always guard with Array.isArray()"

key-files:
  created: []
  modified:
    - src/lib/data/calls.ts
    - src/lib/data/call-detail.ts

key-decisions:
  - "H2 confirmed: calls exist and are returned by getCalls(), but short_summary was silently null due to array/object cast mismatch"
  - "105 metadata_saved calls are correct pipeline behavior (no recording) — not a bug"
  - "Fix applied to both calls.ts and call-detail.ts since both had the same pattern"

patterns-established:
  - "Supabase FK join guard: const x = Array.isArray(raw) ? raw[0] : raw"

duration: 6min
completed: 2026-06-03
---

# Phase 01 Plan 01: DATA-01 Call Explorer Blank State — Diagnosis and Fix Summary

**Supabase one-to-one FK joins return objects not arrays — getCalls() was casting call_analysis as an array and accessing [0], silently dropping all short_summary values in the Call Explorer.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-03T23:20:32Z
- **Completed:** 2026-06-03T23:26:53Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments

- Confirmed root cause of DATA-01 against live DB state (not guessed)
- Fixed `getCalls()` to handle Supabase's object-shaped FK join response
- Fixed `getCallDetail()` for the same pattern on `call_analysis` and `call_transcripts` joins
- Build passes clean (no type errors)

## Task Commits

1. **Task 2: Fix Supabase one-to-one join cast** - `44d09b8` (fix)

**Plan metadata:** committed with final docs commit

_Note: Task 1 was investigation only — no files changed, no separate commit needed._

## Files Created/Modified

- `src/lib/data/calls.ts` — Fixed rawAnalysis cast from array-only to object|array union; access via `analysis?.short_summary` instead of `analysis?.[0]?.short_summary`
- `src/lib/data/call-detail.ts` — Same fix applied to both `call_analysis` and `call_transcripts` join unpacking

## Decisions Made

**H2 confirmed over H1 and H3.**

Evidence:
- Query 1 (status distribution): 63 `complete`, 105 `metadata_saved`, 0 `transcribed`. No calls stranded mid-pipeline.
- Query 3 (call_analysis count): 63 rows — matches exactly the 63 complete calls.
- Query 4 (live join test): `call_analysis` returned as `{short_summary: "..."}` dict, not `[{short_summary: "..."}]` array.
- RLS test: anon key returns 0 rows; service role key returns 168 rows — but `getCalls()` correctly uses `createServiceClient()`, so RLS is not the cause.

The 105 `metadata_saved` calls are intentional: the n8n pipeline's FALSE branch (no recording available) skips transcription and analysis. These calls appear in the explorer with `status: metadata_saved` and no category/summary — which is correct behavior.

**Root cause:** `calls.ts` line 45 typed `call_analysis` as `{ short_summary: string | null }[] | null` (array), but Supabase JS returns one-to-one FK joins as objects. Accessing `analysis?.[0]` on an object always returns `undefined`, so `short_summary` was always `null`. The same pattern existed in `call-detail.ts` for both FK joins.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Same array/object cast bug in call-detail.ts**

- **Found during:** Task 2 (reviewing related files)
- **Issue:** `call-detail.ts` cast `call_analysis` and `call_transcripts` as arrays and accessed `[0]`, causing the call detail page to show no analysis or transcript data for any call.
- **Fix:** Applied the same `Array.isArray(raw) ? raw[0] : raw` guard to both joins.
- **Files modified:** `src/lib/data/call-detail.ts`
- **Committed in:** `44d09b8` (same commit as Task 2)

**2. [Rule 3 - Blocking] Stale `.next/dev/types` cache caused build failure**

- **Found during:** Task 2 verification (`npm run build`)
- **Issue:** Build failed with "Cannot find module '../../../src/app/api/audit/call-count/route.js'" — this was a stale artifact from before plan 01-02 removed those routes, stored in `.next/dev/types/validator.ts` cache.
- **Fix:** Running a fresh build without the stale cache resolved it automatically. No code change needed.
- **Files modified:** None (cache cleared by build tool)
