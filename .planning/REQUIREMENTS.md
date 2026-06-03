# Requirements: Pfitzer Pulse

**Defined:** 2026-06-03
**Milestone:** v2 — Polish & Complete
**Core Value:** Karen and Garret can understand what's happening on every call without listening to recordings

## v2 Requirements

### BRAND — Visual Design System

- [ ] **BRAND-01**: App applies new brand fonts, colors, and logo throughout all pages
- [ ] **BRAND-02**: Excessive spacing is fixed across all pages — tighter, more professional layout
- [ ] **BRAND-03**: Consistent visual language across all tabs (sidebar, header, cards, tables)

### DASH — Dashboard Fixes

- [ ] **DASH-01**: Chart tooltip z-index bug is fixed (tooltip text no longer renders behind chart bars)
- [ ] **DASH-02**: Recent Calls list shows full date + time (not time only)
- [ ] **DASH-03**: Recent Calls rows are clickable and navigate to the call detail page
- [ ] **DASH-04**: Recent Calls layout is tightened — wasted whitespace removed
- [ ] **DASH-05**: Agent and Category fields display correctly in Recent Calls for all fully-processed calls
- [ ] **DASH-06**: Calls shorter than ~25 seconds are excluded from all dashboard views globally
- [ ] **DASH-07**: Calls with Release Cause = "No Digit" are excluded from all views globally

### TRENDS — Trends Tab

- [ ] **TRENDS-01**: Trends tab displays call volume over time (daily or weekly chart)
- [ ] **TRENDS-02**: Trends tab displays category breakdown over time
- [ ] **TRENDS-03**: Trends tab displays per-agent call volume over time
- [ ] **TRENDS-04**: Trends tab has a date range filter control

### RECAP — Recaps Tab

- [ ] **RECAP-01**: Claude summary prompt is improved to suppress generic/geographic observations irrelevant to a regional pest control company
- [ ] **RECAP-02**: Recap display UI is improved for layout and readability

### AUDIT — Audits Tab

- [ ] **AUDIT-01**: Each audit score entry links directly to the source call detail page
- [ ] **AUDIT-02**: Scorecard sections have improved navigation (section tabs or anchor jump links)

### SETTINGS — Settings Page

- [ ] **SETTINGS-01**: Settings page allows adding, editing, and removing agents (no auth required)
- [ ] **SETTINGS-02**: Settings page allows configuring daily recap email recipients

### DATA — Call Explorer & Pipeline

- [ ] **DATA-01**: Root cause of Call Explorer showing no data is identified and fixed

### SEC — Security Hardening

- [ ] **SEC-01**: `/api/audit/run` and `/api/audit/call-count` are protected with `INGEST_SECRET` bearer token check
- [ ] **SEC-02**: n8n credential exposure risk (credentials in plaintext workflow JSON/execution logs) is assessed and mitigated or formally documented

---

## Future Requirements (Deferred)

### Auth — Login & Sessions (v3)

- **AUTH-01**: User can log in with email and password (Supabase Auth)
- **AUTH-02**: Dashboard requires authentication to access
- **AUTH-03**: Settings page includes password change flow
- **AUTH-04**: Supabase RLS policies enforced for session-scoped queries

### SETTINGS-ADVANCED (v3)

- **SETTINGS-03**: Audit prompt / scoring criteria are configurable via Settings UI (stored in DB, versioned)

### PERF — Performance (deferred)

- **PERF-01**: Call data pagination moved server-side (range queries, not full table load)
- **PERF-02**: Dashboard uses ISR/revalidate instead of noStore for improved load time

## Out of Scope

| Feature | Reason |
|---------|--------|
| Supabase Auth / login page | Deferred to v3; dashboard URL not publicly shared yet |
| Audit prompt editor in Settings | High complexity (DB storage, versioning, UI); defer to v3 |
| Real-time call monitoring | Out of scope for batch-ingestion architecture |
| Mobile app | Web-first; mobile later |
| Server-side pagination | Low urgency at current scale; deferred |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| DASH-06 | Phase 1 | Pending |
| DASH-07 | Phase 1 | Pending |
| BRAND-01 | Phase 2 | Pending |
| BRAND-02 | Phase 2 | Pending |
| BRAND-03 | Phase 2 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| DASH-05 | Phase 3 | Pending |
| RECAP-01 | Phase 3 | Pending |
| RECAP-02 | Phase 3 | Pending |
| TRENDS-01 | Phase 4 | Pending |
| TRENDS-02 | Phase 4 | Pending |
| TRENDS-03 | Phase 4 | Pending |
| TRENDS-04 | Phase 4 | Pending |
| AUDIT-01 | Phase 5 | Pending |
| AUDIT-02 | Phase 5 | Pending |
| SETTINGS-01 | Phase 5 | Pending |
| SETTINGS-02 | Phase 5 | Pending |

**Coverage:**
- v2 requirements: 22 total
- Mapped to phases: 22 (all mapped)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-03*
*Last updated: 2026-06-03 — roadmap created, all 22 requirements mapped to 5 phases*
