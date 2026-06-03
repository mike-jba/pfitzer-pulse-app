---
phase: 01-foundation-and-security
verified: 2026-06-03T23:33:56Z
status: passed
score: 5/5 must-haves verified
---

# Phase 1: Foundation and Security Verification Report

**Phase Goal:** The dashboard shows real, clean call data and all API routes are protected.
**Verified:** 2026-06-03T23:33:56Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Call Explorer displays call records — root cause of "no data" blank state identified and resolved | VERIFIED | H2 confirmed against live DB: 63 complete calls exist; getCalls() had Array cast mismatch on FK join silently dropping short_summary; fixed with Array.isArray() guard in calls.ts line 53 |
| 2  | Short calls (under ~25 seconds) do not appear in dashboard, call list, or any aggregate counts | VERIFIED | MIN_CALL_DURATION_SECONDS = 25 exported from constants.ts; .gt("duration_seconds", MIN_CALL_DURATION_SECONDS) applied in getCalls() (calls.ts:37) and all five getDashboardData() sub-queries (dashboard.ts lines 75, 81, 89, 95, 103) |
| 3  | "No Digit" robocall/hangup calls are excluded from all views globally | VERIFIED | Approach A (duration proxy) formally documented in constants.ts; no release_cause column exists in DB (confirmed 2026-06-03); 16-25s cluster (76/168 calls, 45%) excluded by the same MIN_CALL_DURATION_SECONDS filter |
| 4  | /api/audit/run and /api/audit/call-count reject unauthenticated requests (401) or no longer exist (404) | VERIFIED | Both route files deleted (Option A chosen); src/app/api/audit/ directory does not exist; grep for 'api/audit' across src/ returns zero matches; routes now return 404 |
| 5  | n8n credential exposure risk assessed and mitigated or formally documented with accepted-risk note | VERIFIED | docs/security-notes.md exists, contains SEC-02 section with risk description, controls, residual risk, explicit accepted-risk position, and sign-off by Garret Pfitzer / Mike Sorenson dated 2026-06-03 |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/data/calls.ts` | getCalls() with Array.isArray() guard and MIN_CALL_DURATION_SECONDS filter | VERIFIED | 73 lines; imports MIN_CALL_DURATION_SECONDS; Array.isArray guard at line 53; .gt filter at line 37; uses createServiceClient() |
| `src/app/api/ingest/analysis/route.ts` | Resilient denorm that doesn't strand calls; validateIngestAuth present | VERIFIED | 114 lines; validateIngestAuth at line 57; processing_status='complete' set in denorm update (line 98); failure is non-fatal with logged error (line 110) |
| `src/lib/actions/audit.ts` | 'use server' directive; runAudit() and getAuditCallCount() | VERIFIED | Starts with 'use server' at line 1; exports runAudit() at line 30 and getAuditCallCount() (present in file, uses createServiceClient()); full audit logic ported from deleted routes |
| `src/components/audits/new-audit-modal.tsx` | No fetch('/api/audit references | VERIFIED | Imports runAudit, getAuditCallCount from '@/lib/actions/audit' (line 13); calls getAuditCallCount() at line 42 and runAudit() at line 64; grep for 'fetch.*api/audit' returns zero matches |
| `src/app/api/audit/run/route.ts` | Deleted or returns 401 | VERIFIED | File does not exist; entire src/app/api/audit/ directory is absent |
| `src/app/api/audit/call-count/route.ts` | Deleted or returns 401 | VERIFIED | File does not exist; entire src/app/api/audit/ directory is absent |
| `docs/security-notes.md` | Exists and contains 'n8n' | VERIFIED | 91 lines; SEC-02 section present; contains 'n8n' throughout; accepted-risk sign-off at lines 88-90 |
| `src/lib/data/constants.ts` | Exports MIN_CALL_DURATION_SECONDS | VERIFIED | 17 lines; exports MIN_CALL_DURATION_SECONDS = 25; includes DASH-06/DASH-07 documentation with DB evidence |
| `src/lib/data/calls.ts` | Imports and uses MIN_CALL_DURATION_SECONDS with .gt() filter | VERIFIED | import at line 4; .gt("duration_seconds", MIN_CALL_DURATION_SECONDS) at line 37 |
| `src/lib/data/dashboard.ts` | Duration filter on all five sub-queries | VERIFIED | import at line 4; exactly five .gt("duration_seconds", MIN_CALL_DURATION_SECONDS) calls at lines 75, 81, 89, 95, 103 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/audits/new-audit-modal.tsx` | `src/lib/actions/audit.ts` | direct import + call replacing fetch to /api/audit/* | WIRED | Import at line 13; getAuditCallCount called at line 42; runAudit called at line 64; no fetch('/api/audit) references remain |
| `src/lib/data/dashboard.ts` | `src/lib/data/constants.ts` | import shared threshold | WIRED | import { MIN_CALL_DURATION_SECONDS } from "./constants" at line 4; used in all five sub-queries |
| `src/lib/data/calls.ts` | `src/lib/data/constants.ts` | import shared threshold | WIRED | import { MIN_CALL_DURATION_SECONDS } from "./constants" at line 4; used in getCalls() query |

### Anti-Patterns Found

None. No TODO/FIXME/placeholder patterns found in the modified files. The denorm update has a comment "Non-fatal if this update fails" with a concrete console.error — this is intentional resilience documentation, not a stub.

### Human Verification Recommended

The following items cannot be verified programmatically and should be spot-checked when the app is next loaded:

#### 1. Call Explorer renders rows

**Test:** Navigate to /calls in the running app (Vercel deployment or local dev)
**Expected:** Call records appear in the table with categories, durations, and agent names populated for complete calls; metadata_saved calls appear with status but no category/summary
**Why human:** Structural wiring is verified; visual rendering requires a browser

#### 2. Dashboard KPI numbers are non-zero and plausible

**Test:** Navigate to /dashboard
**Expected:** callsYesterday, callsThisWeek, callsThisMonth all show values reflecting calls longer than 25 seconds only; the "yesterday" count should be lower than what was showing before (noise removed)
**Why human:** Requires live DB data and visual confirmation

#### 3. Audit modal still works end-to-end

**Test:** Open the New Audit modal on /audits; select an agent and date range; click Run Audit
**Expected:** Audit runs successfully and redirects to /audits/[id] — server action calls complete without network errors
**Why human:** Server action invocation from a client component requires a running Next.js server; structural wiring is verified but execution path needs runtime confirmation

## Gaps Summary

No gaps. All 5 observable truths are verified against the actual codebase. All 10 required artifacts exist, are substantive, and are wired correctly. All 3 key links are connected. No blocker anti-patterns found.

---

_Verified: 2026-06-03T23:33:56Z_
_Verifier: Claude (gsd-verifier)_
