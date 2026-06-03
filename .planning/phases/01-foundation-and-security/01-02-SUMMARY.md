---
phase: 01-foundation-and-security
plan: "02"
subsystem: api
tags: [server-actions, security, next.js, n8n, supabase, anthropic]

# Dependency graph
requires:
  - phase: 01-foundation-and-security/01-01
    provides: Phase 1 plan structure and DATA-01 investigation groundwork
provides:
  - SEC-01 closed: audit ops moved to server actions, public unauthenticated routes deleted
  - SEC-02 formally documented with accepted-risk position and v3 mitigation roadmap
  - src/lib/actions/audit.ts server action module for runAudit and getAuditCallCount
affects:
  - 01-03-PLAN.md (same phase, can reference SEC-01 as resolved)
  - Future audit feature work (must use server actions, not fetch to /api/audit/*)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Action pattern: browser-invoked long-running ops use 'use server' actions, not public API routes"
    - "Route deletion preferred over auth-gating when route has no external callers"

key-files:
  created:
    - src/lib/actions/audit.ts
    - docs/security-notes.md
  modified:
    - src/components/audits/new-audit-modal.tsx
  deleted:
    - src/app/api/audit/run/route.ts
    - src/app/api/audit/call-count/route.ts

key-decisions:
  - "SEC-01: Chose Option A (delete routes) over Option B (add INGEST_SECRET auth) because no external callers existed after modal was rewired to server actions"
  - "SEC-02: Accepted residual n8n credential risk for v2; documented mitigations for v3 (env vars, log retention, 2FA, key rotation)"

patterns-established:
  - "Server Action pattern: client components import and call 'use server' functions directly for sensitive server-side work"

# Metrics
duration: 5min
completed: 2026-06-03
---

# Phase 1 Plan 02: SEC-01 + SEC-02 Security Summary

**Closed unauthenticated audit API surface by migrating to Next.js Server Actions and formally documented the n8n credential exposure risk with accepted-risk position**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-03T23:21:28Z
- **Completed:** 2026-06-03T23:26:13Z
- **Tasks:** 3
- **Files modified/created:** 5 (2 created, 1 modified, 2 deleted)

## Accomplishments

- Created `src/lib/actions/audit.ts` with `'use server'` directive, porting full audit logic from both deleted route handlers
- Rewired `new-audit-modal.tsx` to call server actions directly — no more `fetch('/api/audit/*')` from the browser
- Deleted the two public unauthenticated route files; build passes with no type errors and routes no longer appear in Next.js route manifest
- Documented SEC-02 (n8n credential exposure) in `docs/security-notes.md` with risk description, controls, residual risk, accepted-risk position, and v3 mitigation roadmap

## Task Commits

Each task was committed atomically:

1. **Task 1: Create audit server actions and rewire the modal** - `22bcdf4` (feat)
2. **Task 2: Lock down the public audit API routes** - `7d0db83` (feat)
3. **Task 3: Write SEC-02 n8n credential risk assessment** - `2c3ba52` (docs)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `src/lib/actions/audit.ts` — New server action module: `runAudit()` and `getAuditCallCount()` with `'use server'` directive; full audit scoring logic ported from deleted API routes
- `src/components/audits/new-audit-modal.tsx` — Replaced `fetch('/api/audit/call-count?...')` and `fetch('/api/audit/run', ...)` with direct server action imports/calls
- `docs/security-notes.md` — SEC-01 resolution note + SEC-02 accepted-risk documentation
- `src/app/api/audit/run/route.ts` — DELETED
- `src/app/api/audit/call-count/route.ts` — DELETED

## Decisions Made

**Route deletion (Option A) chosen over auth-gating (Option B):**
Grepped the entire repo before deleting — `new-audit-modal.tsx` was the only caller of both routes. Once the modal was rewired to server actions, no code referenced the routes at all. Deleting them entirely reduces attack surface more thoroughly than adding a Bearer check and leaves no dead API surface. The `/api/audit/*` routes now return 404.

**Build cache issue resolved:**
After deleting the route files, `npm run build` failed because `.next/dev/types/validator.ts` (a Turbopack-generated TypeScript manifest used in dev mode) still referenced the deleted routes. The fix was deleting `.next/dev/` — it is regenerated during `next dev` and is not needed for production builds. The production-relevant `.next/types/routes.d.ts` was already correct.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stale Turbopack dev type manifest caused build failure after route deletion**

- **Found during:** Task 2 (Lock down routes)
- **Issue:** `.next/dev/types/validator.ts` is a Turbopack-generated file that includes TypeScript imports for every route. After deleting the audit routes, Next.js regenerated this file during the TypeScript check phase but pulled stale data from `.next/dev/` cache, causing `Cannot find module` type errors pointing at the deleted routes.
- **Fix:** Deleted the `.next/dev/` directory (not committed — gitignored). The build succeeded cleanly on the next run.
- **Files modified:** `.next/dev/` directory deleted (not source-controlled)
- **Verification:** Clean build with 15 routes listed, no audit routes present
- **Committed in:** N/A — `.next/` is gitignored

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking build cache issue)
**Impact on plan:** Necessary for build to pass. No scope creep.

## Issues Encountered

- Turbopack dev type manifest stale after route deletion — see deviation above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- SEC-01 is fully closed. Audit operations are server-side only.
- SEC-02 is formally documented with accepted-risk sign-off. No action needed before v3.
- Ready to proceed to Plan 03 (remaining Phase 1 items).

---
*Phase: 01-foundation-and-security*
*Completed: 2026-06-03*
