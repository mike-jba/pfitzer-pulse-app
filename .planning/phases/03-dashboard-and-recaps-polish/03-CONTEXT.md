# Phase 3: Dashboard & Recaps Polish - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the dashboard's Recent Calls section and make the daily recap emails and /recaps page readable and useful. DASH-01 (tooltip z-index) and DASH-02 (date/time display) were already resolved during Phase 2 verification. Remaining work: Recent Calls row density, click-to-detail, agent/category display, recap page structure, and Claude recap prompt quality.

</domain>

<decisions>
## Implementation Decisions

### Recent Calls — row content
- Keep current columns: date/time, caller, duration, category, agent
- Add call outcome or one-line summary as an additional column/field
- Row count: Claude's discretion — fit the card height without scrolling

### Recent Calls — click behavior
- Clicking a row opens a slide-out panel (not full navigation to /calls/[id])
- Panel shows full call detail: metadata, AI analysis, transcript
- Avoids forcing Karen/Garret to hit Back to return to the dashboard

### Recent Calls — pending analysis state
- Calls without completed AI analysis show a "Pending" badge for agent/category fields
- No hiding of unanalyzed rows — they still appear, just with Pending badges

### Recap page — layout
- Stats card at the top of each recap: total calls, top category, key flags (bookings, complaints, cancellations)
- Narrative section below the stats card (bullets or short paragraphs)
- Most recent recap shown at full size at top of page
- Past 30 days listed below in collapsible rows — collapsed state shows: date + one-line summary (e.g. "June 3 — 41 calls — High billing inquiries")
- Clicking a past recap row expands it in-place to show the full recap

### Recap email — content priorities
- Overview: total call count for the day
- Week-over-week comparison using 7-day rolling average (e.g. "38 calls today vs. 44-call weekly average")
- Category breakdown: what types of calls dominated
- Trends: flag notable patterns (e.g. spike in spider calls, increase in billing issues) — only when there's actual data to support it
- Action items: calls that may need follow-up (complaints, cancellations, unresolved callbacks)

### Recap email — tone and style
- Concise business briefing tone — direct, factual, bullet-heavy
- Reads like a manager's morning report

### Recap email — what to avoid
- No generic location/geography filler ("customers in the South Dakota region...")
- No corporate-speak
- No speculation from a single day's data — only flag trends when evidence supports it
- Don't repeat stats already shown in the stats card — add interpretation

### Claude's Discretion
- Exact slide-out panel component design and animation
- Number of Recent Calls rows shown
- Specific stat metrics shown in recap stats card (beyond total calls + top category)
- HTML formatting of recap email body

</decisions>

<specifics>
## Specific Ideas

- Slide-out panel for call detail is preferred over full-page navigation — reduces need to use Back button
- Recap email comparison: 7-day rolling average is more meaningful than same-day-last-week for a business with day-of-week variation
- Collapsed recap history row format: "June 3 — 41 calls — High billing inquiries" — date, count, one notable thing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-dashboard-and-recaps-polish*
*Context gathered: 2026-06-04*
