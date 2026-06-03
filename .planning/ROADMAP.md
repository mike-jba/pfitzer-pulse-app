# Roadmap: Pfitzer Pulse

## Overview

Milestone v2 "Polish & Complete" takes the working v1 MVP and makes it production-ready for daily use by Karen and Garret. The work moves in dependency order: fix data visibility and security first, then apply the brand system as a consistent visual foundation, then polish the dashboard and recaps, then build the stub Trends tab, then complete the remaining UX improvements in Audits and Settings.

## Milestones

- ✅ **v1 MVP** - Chunks 1-12 (complete 2026-06-03, not GSD-planned)
- 🚧 **v2 Polish & Complete** - Phases 1-5 (in progress)

## Phases

### Phase 1: Foundation & Security

**Goal**: The dashboard shows real, clean call data and all API routes are protected.
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, SEC-01, SEC-02, DASH-06, DASH-07

**Success Criteria** (what must be TRUE):
1. Call Explorer displays call records — the root cause of the "no data" blank state is identified and resolved
2. Short calls (under ~25 seconds) do not appear in the dashboard, call list, or any aggregate counts
3. "No Digit" robocall/hangup calls are excluded from all views globally
4. `/api/audit/run` and `/api/audit/call-count` reject unauthenticated requests with a 401 response
5. n8n credential exposure risk is assessed and either mitigated or formally documented with an accepted-risk note

**Plans**: 3 plans (2 waves) — ✓ Complete 2026-06-03

Plans:
- [x] 01-01-PLAN.md — Diagnose and fix DATA-01 Call Explorer blank state (wave 1)
- [x] 01-02-PLAN.md — Audit route lockdown via server actions (SEC-01) + n8n credential risk note (SEC-02) (wave 1)
- [x] 01-03-PLAN.md — Global short-call and "No Digit" exclusion filters (DASH-06, DASH-07) (wave 2)

---

### Phase 2: Brand System

**Goal**: The app looks and feels like a Pfitzer Pest Control product — consistent brand fonts, colors, logo, and tight spacing throughout.
**Depends on**: Phase 1
**Requirements**: BRAND-01, BRAND-02, BRAND-03

**Success Criteria** (what must be TRUE):
1. Brand fonts and colors are applied consistently across all pages (dashboard, calls, audits, recaps, trends, settings)
2. The Pfitzer logo appears in the sidebar/header replacing any generic placeholder
3. Excessive whitespace is removed — pages feel dense and professional, not padded
4. All tabs share a consistent visual language: same card styles, same table styles, same sidebar treatment

**Plans**: TBD

Plans:
- [ ] 02-01: Define and apply brand tokens (colors, fonts, logo) across layout and global styles (BRAND-01)
- [ ] 02-02: Tighten spacing and enforce visual consistency across all pages (BRAND-02, BRAND-03)

---

### Phase 3: Dashboard & Recaps Polish

**Goal**: The dashboard is accurate, navigable, and the daily recap emails and recap page are readable and useful.
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, RECAP-01, RECAP-02

**Success Criteria** (what must be TRUE):
1. Chart tooltips render on top of chart bars without z-index clipping
2. Recent Calls list shows full date and time (not time-only) and clicking any row navigates to that call's detail page
3. Recent Calls rows are compact — no wasted vertical space between entries
4. Agent name and primary category display correctly in Recent Calls for all calls that have completed AI analysis
5. Daily recap emails contain focused, relevant observations about the pest control business (no generic geographic commentary)
6. The /recaps page is readable — recap content is well-formatted with clear section structure

**Plans**: TBD

Plans:
- [ ] 03-01: Fix chart tooltip z-index and Recent Calls display issues (DASH-01, DASH-02, DASH-03, DASH-04)
- [ ] 03-02: Fix Agent and Category display in Recent Calls (DASH-05)
- [ ] 03-03: Improve Claude recap prompt and recap display UI (RECAP-01, RECAP-02)

---

### Phase 4: Trends Tab

**Goal**: The Trends tab is a fully functional historical analysis view with charts for call volume, category breakdown, and agent performance over a selectable date range.
**Depends on**: Phase 3
**Requirements**: TRENDS-01, TRENDS-02, TRENDS-03, TRENDS-04

**Success Criteria** (what must be TRUE):
1. Trends tab shows a call volume chart with a daily or weekly time axis (not a placeholder)
2. Trends tab shows a category breakdown chart over the selected time period
3. Trends tab shows per-agent call volume over the selected time period
4. A date range filter control lets Karen or Garret select the period they want to analyze — changing the range updates all three charts

**Plans**: TBD

Plans:
- [ ] 04-01: Build Trends data layer — Supabase queries for volume, category, and agent time-series data (TRENDS-01, TRENDS-02, TRENDS-03, TRENDS-04)
- [ ] 04-02: Build Trends UI — three Recharts charts + date range filter control (TRENDS-01, TRENDS-02, TRENDS-03, TRENDS-04)

---

### Phase 5: Audit Polish & Settings

**Goal**: Audit scorecards are easy to navigate and link back to source calls; the Settings page lets Karen manage agents and recap recipients without needing Supabase dashboard access.
**Depends on**: Phase 4
**Requirements**: AUDIT-01, AUDIT-02, SETTINGS-01, SETTINGS-02

**Success Criteria** (what must be TRUE):
1. Each call row in an audit scorecard has a link that navigates directly to that call's detail page
2. Audit scorecard sections are navigable via tabs or anchor links — users do not need to scroll past all criteria to reach coaching notes
3. The Settings page shows a list of agents and allows adding, editing, and removing them without Supabase dashboard access
4. The Settings page allows adding and removing daily recap email recipients

**Plans**: TBD

Plans:
- [ ] 05-01: Add call drill-down links and scorecard section navigation (AUDIT-01, AUDIT-02)
- [ ] 05-02: Build Settings page — agent management and email recipient config (SETTINGS-01, SETTINGS-02)

---

## Progress

| Phase | Requirements | Plans Complete | Status | Completed |
|-------|-------------|----------------|--------|-----------|
| 1. Foundation & Security | DATA-01, SEC-01, SEC-02, DASH-06, DASH-07 | 3/3 | ✓ Complete | 2026-06-03 |
| 2. Brand System | BRAND-01, BRAND-02, BRAND-03 | 0/2 | Not started | - |
| 3. Dashboard & Recaps Polish | DASH-01–05, RECAP-01, RECAP-02 | 0/3 | Not started | - |
| 4. Trends Tab | TRENDS-01–04 | 0/2 | Not started | - |
| 5. Audit Polish & Settings | AUDIT-01, AUDIT-02, SETTINGS-01, SETTINGS-02 | 0/2 | Not started | - |

**Coverage:** 22/22 v2 requirements mapped
