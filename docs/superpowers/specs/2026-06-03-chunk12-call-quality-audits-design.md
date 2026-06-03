# Chunk 12 — Call Quality Audits Design

**Date:** 2026-06-03  
**Status:** Approved  
**Reference:** `docs/Jil T. - April Scorecard 2026.pdf`, `docs/voxa-scoring-framework.md`

---

## Overview

An on-demand call quality audit system for Pfitzer Pest Control. Karen or Garret selects an agent + date range (or a specific call from the call detail page), the system scores all selected calls against the Voxa 30-criteria DNA framework using Claude, and displays a scorecard report.

---

## Pages & Routes

| Route | Description |
|---|---|
| `/audits` | List of all past audits. "New Audit" button opens a creation modal. |
| `/audits/[id]` | Audit detail — scorecard accordion, strengths/coaching, per-call breakdown |
| `/calls/[id]` | **Existing page** — gains an "Audit this call" button in the header |

No additional sub-routes. The call detail page at `/calls/[id]` already handles the per-call view.

---

## Audit Creation Flow

Two entry points, same modal:

1. **Audits page → "New Audit"** — user picks agent + date range. System finds all `complete`-status calls for that agent in the range (up to 25).
2. **Call detail page → "Audit this call"** — modal pre-filled with this specific call's agent and date, `call_ids` array locked to just that call.

Modal fields:
- Agent (dropdown — Karen, Ashley, Jil)
- Date range (start/end date pickers)
- Call count preview (shows how many eligible calls found before submitting)
- Submit button → triggers `POST /api/audit/run` → spinner overlay → redirect to `/audits/[id]`

The UX is **synchronous with a loading overlay**. Expected wait: ~5–10s for a single call, ~30–40s for 25 calls. A status message updates during processing ("Scoring call 3 of 12…" if we can stream progress, otherwise a static spinner).

---

## Scoring Framework

### Criteria

30 DNA criteria derived from the Voxa framework + Bonus section (see `docs/Jil T. - April Scorecard 2026.pdf` for the complete real-world mapping):

| # | Criterion | Section |
|---|---|---|
| 1 | Unique Greeting | Enthusiasm |
| 2 | Positive Energy & Tone | Enthusiasm |
| 3 | Ask Customer's Name | Enthusiasm |
| 4 | Double Intro — Opening | Enthusiasm |
| 5 | Ask Questions About the Issue (3–5) | Engage |
| 6 | Show Interest in the Customer | Engage |
| 7 | Connect with Customer / Build Rapport | Empathy |
| 8 | Validate the Customer | Empathy |
| 9 | Use Customer's Name During Call | Empathy |
| 10 | Use Positive Words | Encourage |
| 11 | Reassure with Confidence | Encourage |
| 12 | Gather Customer Information | Booking Strategy |
| 13 | Upgrade List / Fast-Track Support | Booking Strategy |
| 14 | Hail Mary | Booking Strategy |
| 15 | Share Your Goal | Educate |
| 16 | Deliver Company Value Proposition | Educate |
| 17 | Explain Application Style & Treatment Areas | Educate |
| 18 | Explain Products & Safety | Educate |
| 19 | Set Expectations / Explain Process with Tech | Educate |
| 20 | Offer Proposal + Offer Price | Educate |
| 21 | Offer Additional Services | Extra Mile |
| 22 | Offer or Review Membership Benefits | Extra Mile |
| 23 | Express Gratitude & Close Professionally | Extra Mile |
| 24 | Double Outro — Closing | Extra Mile |
| 25 | Effort to Book the Call | Bonus |
| 26 | Effort to Apply the DNA Principles | Bonus |
| 27 | Overall Effort | Bonus |
| 28 | Educate First, Price Second (sequence matters) | Bonus |
| 29 | De-escalation Handling (if applicable) | Bonus |
| 30 | Navigate Objection (if applicable) | Bonus |

### Score Values

Each criterion gets one of four flags — identical to the human scorecard:

| Flag | Points | Meaning |
|---|---|---|
| `Yes` | 1.0 | Clearly demonstrated |
| `GA` | 0.5 | Gave Attempt — genuine but incomplete |
| `No` | 0.0 | Not demonstrated |
| `NA` | excluded | Not applicable to this call type |

### Score Math

- **Per-call score** = `sum(points) / count(non-NA criteria)` × 100%
- **Section score** = average of applicable (non-NA) criteria within the section
- **Overall audit score** = average of all per-call scores
- **No weighting** for MVP — all criteria count equally within their section

NA criteria are excluded from the denominator. An agent is never penalized for criteria that had no opportunity to apply.

---

## API Route

**`POST /api/audit/run`**  
Protected by `Authorization: Bearer <INGEST_SECRET>`. Uses service role Supabase client.

### Request Body

```typescript
{
  agent_id: string;           // UUID — required
  call_ids?: string[];        // Optional — specific calls (single-call flow)
  date_range?: {              // Optional — agent + date range flow
    start: string;            // YYYY-MM-DD
    end: string;
  };
}
```

Either `call_ids` or `date_range` must be provided. If both, `call_ids` takes precedence.

### Processing Steps

1. Resolve call list — if `call_ids`, use directly; if `date_range`, query `calls` where `agent_id` matches and `call_date` in range and `processing_status = 'complete'` (limit 25)
2. Fetch transcripts from `call_transcripts` for resolved call IDs
3. Score each call — Claude API calls in **parallel batches of 5**
4. Aggregate scores — per-criterion averages, per-section averages, overall score
5. Synthesize — one additional Claude call for strengths, coaching opportunities, manager talking points
6. Persist — insert `call_quality_audits` row + `call_quality_scores` rows (one per criterion per call)
7. Return `{ audit_id: string }`

### Scoring Prompt Design (Critical)

The per-call prompt must avoid the "strict auditor" failure mode that produces artificially low scores (34% range vs. expected 70–95%). Key requirements:

- **Frame as presence, not perfection** — "Did the agent demonstrate this behavior at any point during the call?"
- **GA definition** — "Award GA when the agent made a genuine attempt that was incomplete or partially executed. Err toward GA over No when intent is clear."
- **Persona framing** — open with: "You are a supportive manager conducting a training review, not a strict auditor. Your goal is to identify coaching opportunities, not to penalize."
- **Calibration check** — if the computed score is below 55%, the prompt instructs Claude to flag this and reconsider whether it scored too conservatively.
- **Concrete NA guidance** — criteria 13, 14 (Booking Strategy upsell) are NA on non-sales calls; criteria 15–20 (Educate section) are NA on service-only/payment calls; criteria 28–30 (Bonus conditionals) are NA unless that situation arose.

Claude returns structured JSON per call:
```json
{
  "criteria": [
    { "id": 1, "flag": "Yes", "evidence": "Said 'how may I make your day awesome today'" },
    { "id": 8, "flag": "No", "evidence": "No validation language detected" },
    { "id": 13, "flag": "NA", "evidence": "Call was a payment inquiry, no upsell opportunity" }
  ]
}
```

---

## Scorecard UI — `/audits/[id]`

### Header KPIs (3 cards)
- Overall Score (%)
- Calls Scored (count)
- Lowest Section (name)

### Section Accordion
6 sections + Booking Strategy sub-section (under Encourage) + Bonus. Each section row shows:
- Section name + chevron (collapsed by default)
- Section score % with color coding: ≥80% green, 60–79% amber, <60% red

Expanded section shows each criterion as a row:
- Criterion name
- Flag badge: `Yes` (green) / `GA` (amber) / `No` (red) / `NA` (muted)
- Points (e.g., `4.5 / 7` applicable calls scored Yes/GA)
- Evidence snippet (truncated, expandable)

### Feedback Cards (below accordion)
- **Strengths** — 2–4 bullet points from the synthesis call
- **Coaching Opportunities** — 2–4 bullet points
- **Manager Talking Points** — short paragraph for use in 1:1s

### Calls List (bottom)
Collapsible list of each call scored in this audit — links to `/calls/[id]` for the full transcript.

---

## Data Model (Existing Tables)

All tables already exist from Migration 003. No new migrations needed.

**`call_quality_rubrics`** — Voxa rubric is seeded once at startup (or via a migration). One active rubric for MVP.

**`call_quality_audits`** — one row per audit session. Fields used: `rubric_id`, `agent_id`, `date_range_start/end`, `status`, `calls_selected`, `calls_scored`, `overall_score`, `strengths`, `coaching_opportunities`, `manager_talking_points`.

**`call_quality_scores`** — one row per criterion per call. Fields used: `audit_id`, `call_id`, `rubric_criterion_id` (string matching criterion `id` in rubric JSONB), `score` (0 / 0.5 / 1 / null for NA), `max_score` (1.0 or null for NA), `transcript_evidence`, `notes`.

---

## Out of Scope (MVP)

- Rubric management UI (editing criteria or weights in the dashboard)
- Section-level weighting (all criteria equal for now)
- Async/background processing (synchronous with loading overlay)
- Email delivery of audit reports
- Trend charts comparing audit scores over time
- Exporting audit report to PDF
