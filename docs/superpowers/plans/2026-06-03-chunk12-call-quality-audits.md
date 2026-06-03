# Chunk 12 — Call Quality Audits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an on-demand call quality audit system that scores CSR calls against the 30-criterion Voxa DNA framework using Claude, and displays results in a scorecard dashboard.

**Architecture:** A `POST /api/audit/run` route fetches transcripts from Supabase, scores each call via Claude in parallel batches of 5, aggregates scores, runs a synthesis pass for coaching feedback, then persists to `call_quality_audits` + `call_quality_scores`. Two UI entry points (Audits list page + "Audit this call" button on call detail) open a shared modal. Results render on `/audits/[id]` as a section accordion scorecard.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (service role for writes, anon for preview count), `@anthropic-ai/sdk`, Zod v4, Tailwind, shadcn/ui, Lucide React.

**Spec:** `docs/superpowers/specs/2026-06-03-chunk12-call-quality-audits-design.md`

---

## File Map

```
New files:
  src/lib/voxa-rubric.ts                         — 30 criteria definitions + section map
  src/lib/audit-scoring.ts                       — computeCallScore(), aggregateScores()
  src/lib/audit-prompt.ts                        — buildScoringPrompt(), buildSynthesisPrompt()
  src/lib/data/audits.ts                         — getAuditsList(), getAuditDetail()
  src/app/api/audit/run/route.ts                 — POST /api/audit/run
  src/app/audits/[id]/page.tsx                   — audit detail page
  src/components/audits/new-audit-modal.tsx      — modal: agent + date range form
  src/components/audits/scorecard-accordion.tsx  — section accordion UI
  src/lib/audit-scoring.test.ts                  — unit tests for scoring logic
  src/lib/audit-prompt.test.ts                   — smoke tests for prompt builders

Modified files:
  src/app/audits/page.tsx                        — replace placeholder stub with list view
  src/app/calls/[id]/page.tsx                    — add "Audit this call" button
```

---

## Task 1: Install Anthropic SDK

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the SDK**

```bash
npm install @anthropic-ai/sdk
```

Expected output includes: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Verify ANTHROPIC_API_KEY is set**

Check that `ANTHROPIC_API_KEY` exists in `.env.local`. The key is already documented in CLAUDE.md and used by the n8n workflow — confirm it's present.

```bash
# Should print the key (not empty)
node -e "require('dotenv').config({path:'.env.local'}); console.log(!!process.env.ANTHROPIC_API_KEY)"
```

Expected output: `true`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @anthropic-ai/sdk for audit scoring"
```

---

## Task 2: Voxa Rubric Constant

**Files:**
- Create: `src/lib/voxa-rubric.ts`

This file is the single source of truth for the 30 Voxa criteria. The API route reads it to build prompts and to lazy-seed the `call_quality_rubrics` DB table on first use.

- [ ] **Step 1: Create `src/lib/voxa-rubric.ts`**

```typescript
export type VoxaSection =
  | 'Enthusiasm'
  | 'Engage'
  | 'Empathy'
  | 'Encourage'
  | 'Booking Strategy'
  | 'Educate'
  | 'Extra Mile'
  | 'Bonus'

export type VoxaCriterion = {
  id: number
  label: string
  section: VoxaSection
  max_score: 1
  weight: 1
  na_guidance: string
}

export const VOXA_RUBRIC_NAME = 'Voxa DNA Framework v1'

export const VOXA_SECTIONS: VoxaSection[] = [
  'Enthusiasm',
  'Engage',
  'Empathy',
  'Encourage',
  'Booking Strategy',
  'Educate',
  'Extra Mile',
  'Bonus',
]

export const VOXA_CRITERIA: VoxaCriterion[] = [
  {
    id: 1,
    label: 'Unique Greeting',
    section: 'Enthusiasm',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA only if call begins mid-conversation with no audible greeting opportunity.',
  },
  {
    id: 2,
    label: 'Positive Energy & Tone',
    section: 'Enthusiasm',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call.',
  },
  {
    id: 3,
    label: "Ask Customer's Name",
    section: 'Enthusiasm',
    max_score: 1,
    weight: 1,
    na_guidance: "NA if caller is a known repeat customer and agent already knows their name.",
  },
  {
    id: 4,
    label: 'Double Intro — Opening',
    section: 'Enthusiasm',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA if call is very brief (under 60 seconds) with no natural opportunity.',
  },
  {
    id: 5,
    label: 'Ask Questions About the Issue (3–5)',
    section: 'Engage',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA for payment-only calls or calls where customer is purely scheduling a known appointment with no new issue.',
  },
  {
    id: 6,
    label: 'Show Interest in the Customer',
    section: 'Engage',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call.',
  },
  {
    id: 7,
    label: 'Connect with Customer / Build Rapport',
    section: 'Empathy',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA only for very short transactional calls under 90 seconds.',
  },
  {
    id: 8,
    label: 'Validate the Customer',
    section: 'Empathy',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA if customer expresses no frustration or concern to validate.',
  },
  {
    id: 9,
    label: "Use Customer's Name During Call",
    section: 'Empathy',
    max_score: 1,
    weight: 1,
    na_guidance: "NA if agent was unable to obtain the customer's name (criterion 3 was NA).",
  },
  {
    id: 10,
    label: 'Use Positive Words',
    section: 'Encourage',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call.',
  },
  {
    id: 11,
    label: 'Reassure with Confidence',
    section: 'Encourage',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA only for very brief transactional calls where there is no uncertainty to address.',
  },
  {
    id: 12,
    label: 'Gather Customer Information',
    section: 'Booking Strategy',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA for calls from existing customers where all info is already on file and no booking occurred.',
  },
  {
    id: 13,
    label: 'Upgrade List / Fast-Track Support',
    section: 'Booking Strategy',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment calls, follow-up calls, complaint calls, and any call that did not involve scheduling a new service.',
  },
  {
    id: 14,
    label: 'Hail Mary',
    section: 'Booking Strategy',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA unless a booking opportunity was lost — only applies when customer declined to book and agent had a chance to make a final attempt.',
  },
  {
    id: 15,
    label: 'Share Your Goal',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment-only calls, brief scheduling calls, or technician follow-up calls with no sales/education component.',
  },
  {
    id: 16,
    label: 'Deliver Company Value Proposition',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment-only calls or calls from existing customers who are not inquiring about services.',
  },
  {
    id: 17,
    label: 'Explain Application Style & Treatment Areas',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment calls, billing calls, or calls where no service discussion occurred.',
  },
  {
    id: 18,
    label: 'Explain Products & Safety',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment calls, scheduling follow-ups, or calls where no treatment was discussed.',
  },
  {
    id: 19,
    label: 'Set Expectations / Explain Process with Tech',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment-only calls. NA if no appointment was scheduled.',
  },
  {
    id: 20,
    label: 'Offer Proposal + Offer Price',
    section: 'Educate',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA on payment calls, follow-up scheduling, or calls where pricing was not relevant.',
  },
  {
    id: 21,
    label: 'Offer Additional Services',
    section: 'Extra Mile',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA if call was purely transactional (payment, quick scheduling) with no natural upsell opportunity.',
  },
  {
    id: 22,
    label: 'Offer or Review Membership Benefits',
    section: 'Extra Mile',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA if customer is already a member and membership was not discussed, or for very brief calls.',
  },
  {
    id: 23,
    label: 'Express Gratitude & Close Professionally',
    section: 'Extra Mile',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call.',
  },
  {
    id: 24,
    label: 'Double Outro — Closing',
    section: 'Extra Mile',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA only if call ended abruptly without a proper closing opportunity.',
  },
  {
    id: 25,
    label: 'Effort to Book the Call',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA for calls that are not new service inquiries (payments, technician follow-ups, existing scheduling).',
  },
  {
    id: 26,
    label: 'Effort to Apply the DNA Principles',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call as an overall holistic effort assessment.',
  },
  {
    id: 27,
    label: 'Overall Effort',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'Almost never NA — applies to every call.',
  },
  {
    id: 28,
    label: 'Educate First, Price Second (sequence matters)',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA if price was never discussed on this call.',
  },
  {
    id: 29,
    label: 'De-escalation Handling',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA unless customer was clearly upset, frustrated, or in conflict during the call.',
  },
  {
    id: 30,
    label: 'Navigate Objection',
    section: 'Bonus',
    max_score: 1,
    weight: 1,
    na_guidance: 'NA unless customer raised an explicit objection (price, timing, skepticism about service).',
  },
]
```

- [ ] **Step 2: Verify criteria count**

```bash
node -e "const r = require('./src/lib/voxa-rubric.ts'); console.log('nope - use ts-node or just count manually')"
# Manually count: the array above should have exactly 30 entries (ids 1-30)
```

Count ids 1–30 in the file. Expected: 30 criteria.

- [ ] **Step 3: Commit**

```bash
git add src/lib/voxa-rubric.ts
git commit -m "feat: add Voxa 30-criterion rubric constant"
```

---

## Task 3: Scoring Logic (TDD)

**Files:**
- Create: `src/lib/audit-scoring.ts`
- Create: `src/lib/audit-scoring.test.ts`

Pure TypeScript — no external dependencies. All scoring math lives here.

- [ ] **Step 1: Write failing tests in `src/lib/audit-scoring.test.ts`**

```typescript
import {
  FLAG_POINTS,
  computeCallScore,
  aggregateScores,
  type CriterionResult,
} from './audit-scoring'

describe('FLAG_POINTS', () => {
  it('maps Yes to 1, GA to 0.5, No to 0, NA to null', () => {
    expect(FLAG_POINTS['Yes']).toBe(1)
    expect(FLAG_POINTS['GA']).toBe(0.5)
    expect(FLAG_POINTS['No']).toBe(0)
    expect(FLAG_POINTS['NA']).toBe(null)
  })
})

describe('computeCallScore', () => {
  const allYes: CriterionResult[] = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    flag: 'Yes',
    evidence: 'test',
  }))

  it('returns 100% when all criteria are Yes', () => {
    const result = computeCallScore('call-1', allYes)
    expect(result.score_pct).toBe(100)
    expect(result.applicable_count).toBe(10)
  })

  it('excludes NA criteria from the denominator', () => {
    const criteria: CriterionResult[] = [
      { id: 1, flag: 'Yes', evidence: '' },
      { id: 2, flag: 'Yes', evidence: '' },
      { id: 3, flag: 'NA', evidence: '' },  // excluded
    ]
    const result = computeCallScore('call-1', criteria)
    expect(result.score_pct).toBe(100)
    expect(result.applicable_count).toBe(2)
  })

  it('scores GA as 0.5 points', () => {
    const criteria: CriterionResult[] = [
      { id: 1, flag: 'Yes', evidence: '' },  // 1.0
      { id: 2, flag: 'GA', evidence: '' },   // 0.5
      { id: 3, flag: 'No', evidence: '' },   // 0.0
    ]
    // total = 1.5, applicable = 3, pct = 50
    const result = computeCallScore('call-1', criteria)
    expect(result.score_pct).toBeCloseTo(50)
    expect(result.applicable_count).toBe(3)
  })

  it('returns 0% when all applicable criteria are No', () => {
    const criteria: CriterionResult[] = [
      { id: 1, flag: 'No', evidence: '' },
      { id: 2, flag: 'No', evidence: '' },
    ]
    expect(computeCallScore('call-1', criteria).score_pct).toBe(0)
  })

  it('returns 0% with 0 applicable criteria (all NA)', () => {
    const criteria: CriterionResult[] = [
      { id: 1, flag: 'NA', evidence: '' },
      { id: 2, flag: 'NA', evidence: '' },
    ]
    const result = computeCallScore('call-1', criteria)
    expect(result.score_pct).toBe(0)
    expect(result.applicable_count).toBe(0)
  })
})

describe('aggregateScores', () => {
  it('computes overall_pct as average of per-call scores', () => {
    const callScores = [
      { call_id: 'a', score_pct: 80, applicable_count: 20, criteria: [] as CriterionResult[] },
      { call_id: 'b', score_pct: 60, applicable_count: 18, criteria: [] as CriterionResult[] },
    ]
    const result = aggregateScores(callScores)
    expect(result.overall_pct).toBeCloseTo(70)
  })

  it('groups section_scores by section from VOXA_CRITERIA', () => {
    // Use criteria ids 1-4 (all Enthusiasm section)
    const callScores = [
      {
        call_id: 'a',
        score_pct: 75,
        applicable_count: 4,
        criteria: [
          { id: 1, flag: 'Yes' as const, evidence: '' },
          { id: 2, flag: 'Yes' as const, evidence: '' },
          { id: 3, flag: 'No' as const, evidence: '' },
          { id: 4, flag: 'NA' as const, evidence: '' },
        ],
      },
    ]
    const result = aggregateScores(callScores)
    const enthusiasm = result.section_scores.find(s => s.section === 'Enthusiasm')
    expect(enthusiasm).toBeDefined()
    // criteria 1, 2 = Yes (1.0 each), 3 = No (0), 4 = NA (excluded)
    // section score = 2/3 applicable = 66.67%
    expect(enthusiasm!.score_pct).toBeCloseTo(66.67, 1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=audit-scoring --no-coverage
```

Expected: FAIL — `Cannot find module './audit-scoring'`

- [ ] **Step 3: Create `src/lib/audit-scoring.ts`**

```typescript
import { VOXA_CRITERIA } from './voxa-rubric'

export type Flag = 'Yes' | 'GA' | 'No' | 'NA'

export type CriterionResult = {
  id: number
  flag: Flag
  evidence: string
  notes?: string
}

export type CallScore = {
  call_id: string
  score_pct: number
  applicable_count: number
  criteria: CriterionResult[]
}

export type CriterionAggregate = {
  id: number
  label: string
  total_points: number
  applicable_calls: number
  avg_pct: number
}

export type SectionScore = {
  section: string
  score_pct: number
  applicable_count: number
  criteria_aggregates: CriterionAggregate[]
}

export type AggregateResult = {
  overall_pct: number
  section_scores: SectionScore[]
  per_call_scores: { call_id: string; score_pct: number }[]
}

export const FLAG_POINTS: Record<Flag, number | null> = {
  Yes: 1,
  GA: 0.5,
  No: 0,
  NA: null,
}

export function computeCallScore(call_id: string, criteria: CriterionResult[]): CallScore {
  let totalPoints = 0
  let applicableCount = 0

  for (const c of criteria) {
    const pts = FLAG_POINTS[c.flag]
    if (pts !== null) {
      totalPoints += pts
      applicableCount++
    }
  }

  const score_pct = applicableCount > 0 ? (totalPoints / applicableCount) * 100 : 0

  return { call_id, score_pct, applicable_count: applicableCount, criteria }
}

export function aggregateScores(callScores: CallScore[]): AggregateResult {
  const overall_pct =
    callScores.length > 0
      ? callScores.reduce((sum, c) => sum + c.score_pct, 0) / callScores.length
      : 0

  // Build per-criterion aggregates across all calls
  const criterionMap = new Map<number, { totalPoints: number; applicableCalls: number }>()
  for (const cs of callScores) {
    for (const cr of cs.criteria) {
      const pts = FLAG_POINTS[cr.flag]
      const existing = criterionMap.get(cr.id) ?? { totalPoints: 0, applicableCalls: 0 }
      if (pts !== null) {
        existing.totalPoints += pts
        existing.applicableCalls++
      }
      criterionMap.set(cr.id, existing)
    }
  }

  // Group by section
  const sectionMap = new Map<string, CriterionAggregate[]>()
  for (const def of VOXA_CRITERIA) {
    const agg = criterionMap.get(def.id) ?? { totalPoints: 0, applicableCalls: 0 }
    const avg_pct =
      agg.applicableCalls > 0 ? (agg.totalPoints / agg.applicableCalls) * 100 : 0

    const entry: CriterionAggregate = {
      id: def.id,
      label: def.label,
      total_points: agg.totalPoints,
      applicable_calls: agg.applicableCalls,
      avg_pct,
    }

    const existing = sectionMap.get(def.section) ?? []
    existing.push(entry)
    sectionMap.set(def.section, existing)
  }

  const section_scores: SectionScore[] = []
  for (const [section, aggregates] of sectionMap) {
    const applicableAggregates = aggregates.filter(a => a.applicable_calls > 0)
    const section_pct =
      applicableAggregates.length > 0
        ? applicableAggregates.reduce((sum, a) => sum + a.avg_pct, 0) / applicableAggregates.length
        : 0

    section_scores.push({
      section,
      score_pct: section_pct,
      applicable_count: applicableAggregates.length,
      criteria_aggregates: aggregates,
    })
  }

  return {
    overall_pct,
    section_scores,
    per_call_scores: callScores.map(cs => ({ call_id: cs.call_id, score_pct: cs.score_pct })),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=audit-scoring --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audit-scoring.ts src/lib/audit-scoring.test.ts
git commit -m "feat: add Voxa scoring logic with tests"
```

---

## Task 4: Prompt Builders

**Files:**
- Create: `src/lib/audit-prompt.ts`
- Create: `src/lib/audit-prompt.test.ts`

- [ ] **Step 1: Write failing smoke tests in `src/lib/audit-prompt.test.ts`**

```typescript
import { buildScoringPrompt, buildSynthesisPrompt } from './audit-prompt'
import type { AggregateResult } from './audit-scoring'

describe('buildScoringPrompt', () => {
  it('includes the supportive-manager framing', () => {
    const prompt = buildScoringPrompt({
      transcript: '[Speaker 0]: Hello, thanks for calling.',
      direction: 'inbound',
      category: 'Scheduling',
      duration_seconds: 120,
    })
    expect(prompt).toContain('supportive manager')
    expect(prompt).toContain('GA')
    expect(prompt).toContain('55%')
  })

  it('includes all 30 criterion ids', () => {
    const prompt = buildScoringPrompt({
      transcript: 'test',
      direction: 'inbound',
      category: 'Scheduling',
      duration_seconds: 60,
    })
    for (let i = 1; i <= 30; i++) {
      expect(prompt).toContain(`"id": ${i}`)
    }
  })

  it('includes NA guidance for criteria 13', () => {
    const prompt = buildScoringPrompt({
      transcript: 'test',
      direction: 'inbound',
      category: 'Payment',
      duration_seconds: 60,
    })
    expect(prompt).toContain('NA on payment calls')
  })
})

describe('buildSynthesisPrompt', () => {
  it('includes agent name and score', () => {
    const aggregate: AggregateResult = {
      overall_pct: 82,
      section_scores: [],
      per_call_scores: [],
    }
    const prompt = buildSynthesisPrompt({
      agent_name: 'Ashley',
      call_count: 5,
      date_range: 'Jun 1–3, 2026',
      aggregate,
    })
    expect(prompt).toContain('Ashley')
    expect(prompt).toContain('82')
    expect(prompt).toContain('coaching_opportunities')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=audit-prompt --no-coverage
```

Expected: FAIL — `Cannot find module './audit-prompt'`

- [ ] **Step 3: Create `src/lib/audit-prompt.ts`**

```typescript
import { VOXA_CRITERIA } from './voxa-rubric'
import type { AggregateResult } from './audit-scoring'

type ScoringPromptInput = {
  transcript: string
  direction: string
  category: string | null
  duration_seconds: number | null
}

export function buildScoringPrompt(input: ScoringPromptInput): string {
  const { transcript, direction, category, duration_seconds } = input

  const criteriaBlock = VOXA_CRITERIA.map(
    c =>
      `  { "id": ${c.id}, "label": "${c.label}", "section": "${c.section}", "na_guidance": "${c.na_guidance}" }`
  ).join(',\n')

  const durationStr = duration_seconds
    ? `${Math.floor(duration_seconds / 60)}m ${duration_seconds % 60}s`
    : 'unknown'

  return `You are a supportive manager at Pfitzer Pest Control conducting a training review of a call center representative. Your role is to recognize strengths and identify coaching opportunities — not to penalize agents for imperfect execution.

Score the following call against 30 Voxa DNA criteria. Use these flags:
- "Yes" (1.0 pt): Behavior clearly demonstrated at any point during the call
- "GA" (0.5 pts): Gave Attempt — agent made a genuine but incomplete attempt. When in doubt between GA and No, choose GA if any intent is present.
- "No" (0 pts): Behavior absent with no meaningful attempt
- "NA": Not applicable to this call — use the na_guidance provided per criterion

SCORING PHILOSOPHY:
- Score the presence of behavior, not perfection. A partial attempt that shows intent = GA.
- If unsure between No and GA, choose GA.
- Judge effort, not outcome: "Effort to book" = Yes even if customer didn't book, as long as agent made a genuine attempt.
- After scoring, check your work: if the overall score would fall below 55%, re-examine your No ratings. Are any of them actually GA-worthy attempts you may have missed?

CALL METADATA:
Direction: ${direction}
Category (from prior analysis): ${category ?? 'unknown'}
Duration: ${durationStr}

TRANSCRIPT:
${transcript}

CRITERIA (score each one):
[
${criteriaBlock}
]

Return ONLY valid JSON in this exact format, with all 30 criteria included:
{
  "criteria": [
    { "id": 1, "flag": "Yes|GA|No|NA", "evidence": "brief quote or paraphrase supporting your rating" },
    ...all 30 criteria...
  ]
}`
}

type SynthesisPromptInput = {
  agent_name: string
  call_count: number
  date_range: string
  aggregate: AggregateResult
}

export function buildSynthesisPrompt(input: SynthesisPromptInput): string {
  const { agent_name, call_count, date_range, aggregate } = input

  const sectionLines = aggregate.section_scores
    .map(s => `  ${s.section}: ${s.score_pct.toFixed(1)}%`)
    .join('\n')

  const allCriteria = aggregate.section_scores.flatMap(s => s.criteria_aggregates)
  const weak = [...allCriteria]
    .filter(c => c.applicable_calls > 0)
    .sort((a, b) => a.avg_pct - b.avg_pct)
    .slice(0, 5)
    .map(c => `  ${c.label}: ${c.avg_pct.toFixed(1)}%`)
    .join('\n')

  const strong = [...allCriteria]
    .filter(c => c.applicable_calls > 0)
    .sort((a, b) => b.avg_pct - a.avg_pct)
    .slice(0, 5)
    .map(c => `  ${c.label}: ${c.avg_pct.toFixed(1)}%`)
    .join('\n')

  return `You are a call center training manager summarizing a quality audit for coaching purposes. Write in a warm, professional, and encouraging tone.

AUDIT SUMMARY:
Agent: ${agent_name}
Date range: ${date_range}
Calls scored: ${call_count}
Overall score: ${aggregate.overall_pct.toFixed(1)}%

Section scores:
${sectionLines}

Strongest criteria (highest average):
${strong}

Weakest criteria (lowest average):
${weak}

Write a coaching summary with exactly these three fields:
1. "strengths": array of 2–4 bullet points highlighting what the agent does consistently well, with specific examples
2. "coaching_opportunities": array of 2–4 specific, actionable improvement areas with concrete suggestions (not generic advice)
3. "manager_talking_points": a 2–3 sentence paragraph a manager could use verbatim in a 1:1 coaching session — warm, specific, and encouraging

Return ONLY valid JSON:
{
  "strengths": ["...", "..."],
  "coaching_opportunities": ["...", "..."],
  "manager_talking_points": "..."
}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=audit-prompt --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audit-prompt.ts src/lib/audit-prompt.test.ts
git commit -m "feat: add Voxa scoring and synthesis prompt builders"
```

---

## Task 5: API Route — POST /api/audit/run

**Files:**
- Create: `src/app/api/audit/run/route.ts`

This route is called from the browser (user-initiated), so auth is via Supabase session cookies, not `INGEST_SECRET`. DB writes use the service role client to bypass RLS.

- [ ] **Step 1: Create `src/app/api/audit/run/route.ts`**

```typescript
import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { VOXA_CRITERIA, VOXA_RUBRIC_NAME } from '@/lib/voxa-rubric'
import { buildScoringPrompt, buildSynthesisPrompt } from '@/lib/audit-prompt'
import { computeCallScore, aggregateScores } from '@/lib/audit-scoring'
import type { CriterionResult, Flag } from '@/lib/audit-scoring'

export const maxDuration = 60

const BodySchema = z.object({
  agent_id: z.string().uuid(),
  call_ids: z.array(z.string().uuid()).optional(),
  date_range: z
    .object({ start: z.string(), end: z.string() })
    .optional(),
})

const CriterionResultSchema = z.object({
  id: z.number(),
  flag: z.enum(['Yes', 'GA', 'No', 'NA']),
  evidence: z.string(),
})

export async function POST(request: Request) {
  // Auth: verify user session
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { agent_id, call_ids, date_range } = parsed.data
  const supabase = createServiceClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // 1. Ensure Voxa rubric exists in DB (lazy seed)
  let rubric_id: string
  const { data: existing } = await supabase
    .from('call_quality_rubrics')
    .select('id')
    .eq('name', VOXA_RUBRIC_NAME)
    .eq('active', true)
    .single()

  if (existing) {
    rubric_id = existing.id as string
  } else {
    const criteria = VOXA_CRITERIA.map(c => ({
      id: c.id,
      label: c.label,
      section: c.section,
      max_score: c.max_score,
      weight: c.weight,
      na_guidance: c.na_guidance,
    }))
    const { data: newRubric, error: rubricError } = await supabase
      .from('call_quality_rubrics')
      .insert({ name: VOXA_RUBRIC_NAME, criteria, active: true })
      .select('id')
      .single()
    if (rubricError || !newRubric) {
      console.error('[audit/run] rubric seed', rubricError)
      return NextResponse.json({ ok: false, error: 'Failed to seed rubric' }, { status: 500 })
    }
    rubric_id = (newRubric as { id: string }).id
  }

  // 2. Resolve call list
  let resolvedCallIds: string[]
  if (call_ids && call_ids.length > 0) {
    resolvedCallIds = call_ids
  } else if (date_range) {
    const { data: calls, error } = await supabase
      .from('calls')
      .select('id')
      .eq('agent_id', agent_id)
      .eq('processing_status', 'complete')
      .gte('call_date', date_range.start)
      .lte('call_date', date_range.end)
      .limit(25)
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    resolvedCallIds = (calls ?? []).map((c: { id: string }) => c.id)
  } else {
    return NextResponse.json(
      { ok: false, error: 'Provide call_ids or date_range' },
      { status: 422 },
    )
  }

  if (resolvedCallIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'No eligible calls found' }, { status: 422 })
  }

  // 3. Fetch transcripts + call metadata
  const { data: callRecords, error: fetchError } = await supabase
    .from('calls')
    .select(`
      id, direction, primary_category, duration_seconds,
      call_transcripts ( transcript_text )
    `)
    .in('id', resolvedCallIds)

  if (fetchError || !callRecords) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch calls' }, { status: 500 })
  }

  // 4. Create the audit record (status: running)
  const { data: audit, error: auditCreateError } = await supabase
    .from('call_quality_audits')
    .insert({
      rubric_id,
      agent_id,
      date_range_start: date_range?.start ?? null,
      date_range_end: date_range?.end ?? null,
      status: 'running',
      calls_selected: resolvedCallIds.length,
      created_by: null,
    })
    .select('id')
    .single()

  if (auditCreateError || !audit) {
    return NextResponse.json({ ok: false, error: 'Failed to create audit' }, { status: 500 })
  }
  const audit_id = (audit as { id: string }).id

  try {
    // 5. Score each call in parallel batches of 5
    async function scoreCall(record: Record<string, unknown>): Promise<ReturnType<typeof computeCallScore>> {
      const transcriptArr = record.call_transcripts as { transcript_text: string | null }[] | null
      const transcript = transcriptArr?.[0]?.transcript_text ?? ''

      const prompt = buildScoringPrompt({
        transcript,
        direction: (record.direction as string) ?? 'unknown',
        category: (record.primary_category as string | null) ?? null,
        duration_seconds: (record.duration_seconds as number | null) ?? null,
      })

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = (message.content[0] as { type: string; text: string }).text
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error(`No JSON in Claude response for call ${record.id}`)

      const parsed = JSON.parse(jsonMatch[0]) as { criteria: unknown[] }
      const criteria: CriterionResult[] = parsed.criteria
        .map((c: unknown) => CriterionResultSchema.safeParse(c))
        .filter(r => r.success)
        .map(r => (r as { success: true; data: CriterionResult }).data)

      return computeCallScore(record.id as string, criteria)
    }

    const BATCH_SIZE = 5
    const callScores: ReturnType<typeof computeCallScore>[] = []
    for (let i = 0; i < callRecords.length; i += BATCH_SIZE) {
      const batch = callRecords.slice(i, i + BATCH_SIZE) as Record<string, unknown>[]
      const batchResults = await Promise.all(batch.map(r => scoreCall(r)))
      callScores.push(...batchResults)
    }

    // 6. Aggregate
    const aggregate = aggregateScores(callScores)

    // 7. Synthesis
    const { data: agentRow } = await supabase
      .from('agents')
      .select('display_name')
      .eq('id', agent_id)
      .single()
    const agent_name = (agentRow as { display_name: string } | null)?.display_name ?? 'Agent'

    const dateRangeStr = date_range
      ? `${date_range.start} to ${date_range.end}`
      : 'Selected calls'

    const synthesisPrompt = buildSynthesisPrompt({
      agent_name,
      call_count: callScores.length,
      date_range: dateRangeStr,
      aggregate,
    })

    const synthesisMessage = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: synthesisPrompt }],
    })

    const synthesisRaw = (synthesisMessage.content[0] as { type: string; text: string }).text
    const synthesisMatch = synthesisRaw.match(/\{[\s\S]*\}/)
    const synthesis = synthesisMatch
      ? (JSON.parse(synthesisMatch[0]) as {
          strengths: string[]
          coaching_opportunities: string[]
          manager_talking_points: string
        })
      : { strengths: [], coaching_opportunities: [], manager_talking_points: '' }

    // 8. Find lowest section
    const lowestSection = aggregate.section_scores
      .filter(s => s.applicable_count > 0)
      .sort((a, b) => a.score_pct - b.score_pct)[0]?.section ?? null

    // 9. Persist scores
    const scoreRows = callScores.flatMap(cs =>
      cs.criteria.map(cr => ({
        audit_id,
        call_id: cs.call_id,
        rubric_criterion_id: String(cr.id),
        score: cr.flag === 'NA' ? null : (cr.flag === 'Yes' ? 1 : cr.flag === 'GA' ? 0.5 : 0),
        max_score: cr.flag === 'NA' ? null : 1,
        transcript_evidence: cr.evidence,
        notes: cr.notes ?? null,
      }))
    )

    if (scoreRows.length > 0) {
      await supabase.from('call_quality_scores').insert(scoreRows)
    }

    // 10. Update audit record to complete
    await supabase
      .from('call_quality_audits')
      .update({
        status: 'complete',
        calls_scored: callScores.length,
        overall_score: aggregate.overall_pct,
        strengths: synthesis.strengths,
        coaching_opportunities: synthesis.coaching_opportunities,
        manager_talking_points: synthesis.manager_talking_points,
        completed_at: new Date().toISOString(),
      })
      .eq('id', audit_id)

    return NextResponse.json({ ok: true, audit_id })
  } catch (err) {
    console.error('[audit/run]', err)
    await supabase
      .from('call_quality_audits')
      .update({ status: 'failed', error_message: String(err) })
      .eq('id', audit_id)
    return NextResponse.json({ ok: false, error: 'Scoring failed' }, { status: 500 })
  }
}
```

> **Note:** The `call_quality_audits` table schema (from Migration 003) does not have an `error_message` column. If the update fails on `error_message`, remove that field from the failed-state update — the status = 'failed' alone is sufficient for MVP.

- [ ] **Step 2: Run the build to check for TypeScript errors**

```bash
npm run build 2>&1 | head -40
```

Expected: No TypeScript errors in the new file. Fix any type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/audit/run/route.ts
git commit -m "feat: add POST /api/audit/run endpoint"
```

---

## Task 6: Audits Data Layer

**Files:**
- Create: `src/lib/data/audits.ts`

- [ ] **Step 1: Create `src/lib/data/audits.ts`**

```typescript
import 'server-only'
import { unstable_noStore as noStore } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { VOXA_CRITERIA, VOXA_SECTIONS } from '@/lib/voxa-rubric'
import type { SectionScore } from '@/lib/audit-scoring'

export type AuditListItem = {
  id: string
  agent_name: string | null
  date_range_start: string | null
  date_range_end: string | null
  status: string
  calls_scored: number | null
  overall_score: number | null
  created_at: string
}

export type AuditScoreRow = {
  call_id: string
  rubric_criterion_id: string
  score: number | null
  max_score: number | null
  transcript_evidence: string | null
  notes: string | null
}

export type AuditDetailData = {
  id: string
  agent_name: string | null
  date_range_start: string | null
  date_range_end: string | null
  status: string
  calls_scored: number | null
  overall_score: number | null
  strengths: string[] | null
  coaching_opportunities: string[] | null
  manager_talking_points: string | null
  completed_at: string | null
  created_at: string
  section_scores: SectionScore[]
  score_rows: AuditScoreRow[]
  scored_call_ids: string[]
}

export async function getAuditsList(): Promise<AuditListItem[]> {
  noStore()
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('call_quality_audits')
    .select(`
      id, status, calls_scored, overall_score, date_range_start, date_range_end, created_at,
      agents ( display_name )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[audits list]', error)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const agentArr = row.agents as { display_name: string }[] | null
    return {
      id: row.id as string,
      agent_name: agentArr?.[0]?.display_name ?? null,
      date_range_start: row.date_range_start as string | null,
      date_range_end: row.date_range_end as string | null,
      status: row.status as string,
      calls_scored: row.calls_scored as number | null,
      overall_score: row.overall_score as number | null,
      created_at: row.created_at as string,
    }
  })
}

export async function getAuditDetail(id: string): Promise<AuditDetailData | null> {
  noStore()
  const supabase = createServiceClient()

  const [auditResult, scoresResult] = await Promise.all([
    supabase
      .from('call_quality_audits')
      .select(`
        id, status, calls_scored, overall_score, date_range_start, date_range_end,
        strengths, coaching_opportunities, manager_talking_points,
        completed_at, created_at,
        agents ( display_name )
      `)
      .eq('id', id)
      .single(),

    supabase
      .from('call_quality_scores')
      .select('call_id, rubric_criterion_id, score, max_score, transcript_evidence, notes')
      .eq('audit_id', id),
  ])

  if (auditResult.error || !auditResult.data) return null

  const row = auditResult.data as Record<string, unknown>
  const agentArr = row.agents as { display_name: string }[] | null
  const scoreRows = (scoresResult.data ?? []) as AuditScoreRow[]

  // Reconstruct section scores from score rows
  const scored_call_ids = [...new Set(scoreRows.map(r => r.call_id))]

  // Build per-criterion aggregates from score_rows
  const criterionMap = new Map<number, { totalPoints: number; applicableCalls: number }>()
  for (const sr of scoreRows) {
    const id = parseInt(sr.rubric_criterion_id)
    const existing = criterionMap.get(id) ?? { totalPoints: 0, applicableCalls: 0 }
    if (sr.score !== null && sr.max_score !== null) {
      existing.totalPoints += sr.score
      existing.applicableCalls++
    }
    criterionMap.set(id, existing)
  }

  const section_scores: SectionScore[] = VOXA_SECTIONS.map(section => {
    const sectionCriteria = VOXA_CRITERIA.filter(c => c.section === section)
    const aggregates = sectionCriteria.map(def => {
      const agg = criterionMap.get(def.id) ?? { totalPoints: 0, applicableCalls: 0 }
      const avg_pct = agg.applicableCalls > 0
        ? (agg.totalPoints / agg.applicableCalls) * 100
        : 0
      return {
        id: def.id,
        label: def.label,
        total_points: agg.totalPoints,
        applicable_calls: agg.applicableCalls,
        avg_pct,
      }
    })

    const applicable = aggregates.filter(a => a.applicable_calls > 0)
    const score_pct = applicable.length > 0
      ? applicable.reduce((s, a) => s + a.avg_pct, 0) / applicable.length
      : 0

    return { section, score_pct, applicable_count: applicable.length, criteria_aggregates: aggregates }
  })

  return {
    id: row.id as string,
    agent_name: agentArr?.[0]?.display_name ?? null,
    date_range_start: row.date_range_start as string | null,
    date_range_end: row.date_range_end as string | null,
    status: row.status as string,
    calls_scored: row.calls_scored as number | null,
    overall_score: row.overall_score as number | null,
    strengths: row.strengths as string[] | null,
    coaching_opportunities: row.coaching_opportunities as string[] | null,
    manager_talking_points: row.manager_talking_points as string | null,
    completed_at: row.completed_at as string | null,
    created_at: row.created_at as string,
    section_scores,
    score_rows: scoreRows,
    scored_call_ids,
  }
}
```

- [ ] **Step 2: Run build check**

```bash
npm run build 2>&1 | head -40
```

Expected: No errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/audits.ts
git commit -m "feat: add audits data layer (getAuditsList, getAuditDetail)"
```

---

## Task 7: New Audit Modal

**Files:**
- Create: `src/components/audits/new-audit-modal.tsx`

Client component. Uses the Supabase browser client for the live call-count preview query.

- [ ] **Step 1: Create `src/components/audits/new-audit-modal.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

type Agent = { id: string; display_name: string }

type Props = {
  agents: Agent[]
  /** Pre-fill and lock to a specific call (single-call audit from call detail page) */
  lockedCallId?: string
  lockedAgentId?: string
  trigger?: React.ReactNode
}

export function NewAuditModal({ agents, lockedCallId, lockedAgentId, trigger }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [agentId, setAgentId] = useState(lockedAgentId ?? agents[0]?.id ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [callCount, setCallCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLocked = !!lockedCallId

  const fetchCallCount = useCallback(async () => {
    if (isLocked) { setCallCount(1); return }
    if (!agentId || !startDate || !endDate) { setCallCount(null); return }

    const supabase = createClient()
    const { count } = await supabase
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('processing_status', 'complete')
      .gte('call_date', startDate)
      .lte('call_date', endDate)

    setCallCount(Math.min(count ?? 0, 25))
  }, [agentId, startDate, endDate, isLocked])

  useEffect(() => {
    fetchCallCount()
  }, [fetchCallCount])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const body = isLocked
      ? { agent_id: agentId, call_ids: [lockedCallId] }
      : { agent_id: agentId, date_range: { start: startDate, end: endDate } }

    try {
      const res = await fetch('/api/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json() as { ok: boolean; audit_id?: string; error?: string }
      if (!json.ok) {
        setError(json.error ?? 'Audit failed')
        setLoading(false)
        return
      }
      setOpen(false)
      router.push(`/audits/${json.audit_id}`)
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            New Audit
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isLocked ? 'Audit This Call' : 'New Quality Audit'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Agent */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="agent">Agent</label>
            <select
              id="agent"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              disabled={isLocked}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              required
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.display_name}</option>
              ))}
            </select>
          </div>

          {/* Date range — hidden when locked to a single call */}
          {!isLocked && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="start">Start Date</label>
                <input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="end">End Date</label>
                <input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* Call count preview */}
          {callCount !== null && (
            <p className="text-sm text-muted-foreground">
              {isLocked
                ? '1 call will be scored against all 30 Voxa criteria.'
                : `${callCount} eligible call${callCount !== 1 ? 's' : ''} found${callCount === 25 ? ' (capped at 25)' : ''}.`}
            </p>
          )}
          {!isLocked && callCount === 0 && startDate && endDate && (
            <p className="text-sm text-amber-600">No completed calls found for this agent in that range.</p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || callCount === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scoring{callCount && callCount > 1 ? ` ${callCount} calls` : ''}…
                </>
              ) : (
                'Run Audit'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

> **Note:** This component uses `Dialog` from shadcn/ui. Run `npx shadcn@latest add dialog` if it is not yet installed. Check `src/components/ui/` first — if `dialog.tsx` already exists, skip the install.

- [ ] **Step 2: Add Dialog component if missing**

```bash
ls src/components/ui/dialog.tsx 2>/dev/null && echo "exists" || npx shadcn@latest add dialog
```

- [ ] **Step 3: Run build check**

```bash
npm run build 2>&1 | head -40
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/audits/new-audit-modal.tsx
git commit -m "feat: add NewAuditModal component"
```

---

## Task 8: Scorecard Accordion Component

**Files:**
- Create: `src/components/audits/scorecard-accordion.tsx`

Client component with expand/collapse per section. Color coding: ≥80% green, 60–79% amber, <60% red.

- [ ] **Step 1: Create `src/components/audits/scorecard-accordion.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { SectionScore } from '@/lib/audit-scoring'

type Props = {
  section_scores: SectionScore[]
  score_rows: {
    call_id: string
    rubric_criterion_id: string
    score: number | null
    max_score: number | null
    transcript_evidence: string | null
  }[]
  call_count: number
}

function scoreColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function scoreBg(pct: number): string {
  if (pct >= 80) return 'bg-emerald-50 border-emerald-200'
  if (pct >= 60) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

function FlagBadge({ score, maxScore }: { score: number | null; maxScore: number | null }) {
  if (score === null || maxScore === null) {
    return <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">N/A</span>
  }
  if (score === 1) return <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">Yes</span>
  if (score === 0.5) return <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">GA</span>
  return <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">No</span>
}

export function ScorecardAccordion({ section_scores, score_rows, call_count }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(section: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }

  // Build a lookup: criterion_id → array of score rows (one per call)
  const criterionRowMap = new Map<string, typeof score_rows>()
  for (const row of score_rows) {
    const existing = criterionRowMap.get(row.rubric_criterion_id) ?? []
    existing.push(row)
    criterionRowMap.set(row.rubric_criterion_id, existing)
  }

  return (
    <div className="space-y-2">
      {section_scores.map(section => {
        const isOpen = expanded.has(section.section)
        const hasScore = section.applicable_count > 0

        return (
          <div
            key={section.section}
            className={`rounded-lg border overflow-hidden ${hasScore ? scoreBg(section.score_pct) : 'bg-muted/30 border-border'}`}
          >
            {/* Section header — always visible */}
            <button
              type="button"
              onClick={() => toggle(section.section)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                {isOpen
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-semibold">{section.section}</span>
                <span className="text-xs text-muted-foreground">
                  ({section.criteria_aggregates.length} criteria)
                </span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${hasScore ? scoreColor(section.score_pct) : 'text-muted-foreground'}`}>
                {hasScore ? `${section.score_pct.toFixed(0)}%` : '—'}
              </span>
            </button>

            {/* Section body — expanded */}
            {isOpen && (
              <div className="border-t bg-background/60">
                {section.criteria_aggregates.map(crit => {
                  const rows = criterionRowMap.get(String(crit.id)) ?? []
                  const applicableRows = rows.filter(r => r.score !== null && r.max_score !== null)
                  const naRows = rows.filter(r => r.score === null)

                  return (
                    <div key={crit.id} className="border-b last:border-b-0 px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            <span className="text-muted-foreground mr-1.5">{crit.id}.</span>
                            {crit.label}
                          </p>
                          {/* Per-call flag row */}
                          {call_count > 1 && rows.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {rows.map((r, i) => (
                                <FlagBadge key={i} score={r.score} maxScore={r.max_score} />
                              ))}
                            </div>
                          )}
                          {/* Evidence for single-call audits */}
                          {call_count === 1 && applicableRows[0]?.transcript_evidence && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {applicableRows[0].transcript_evidence}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {crit.applicable_calls > 0 ? (
                            <span className={`text-sm font-semibold tabular-nums ${scoreColor(crit.avg_pct)}`}>
                              {call_count === 1
                                ? <FlagBadge score={applicableRows[0]?.score ?? null} maxScore={applicableRows[0]?.max_score ?? null} />
                                : `${crit.avg_pct.toFixed(0)}%`}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                          {call_count > 1 && crit.applicable_calls > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {crit.applicable_calls}/{call_count} calls
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/audits/scorecard-accordion.tsx
git commit -m "feat: add ScorecardAccordion component"
```

---

## Task 9: Audits List Page

**Files:**
- Modify: `src/app/audits/page.tsx`

Replace the placeholder stub with a real list that fetches past audits and includes a "New Audit" button.

- [ ] **Step 1: Fetch agents list**

The `NewAuditModal` needs the list of agents. Add a helper to `src/lib/data/audits.ts` — add this function at the bottom of that file:

```typescript
export type AgentRow = { id: string; display_name: string }

export async function getActiveAgents(): Promise<AgentRow[]> {
  noStore()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('agents')
    .select('id, display_name')
    .eq('active', true)
    .order('display_name')
  if (error) { console.error('[agents]', error); return [] }
  return (data ?? []) as AgentRow[]
}
```

- [ ] **Step 2: Overwrite `src/app/audits/page.tsx`**

```tsx
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { ClipboardCheck, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NewAuditModal } from '@/components/audits/new-audit-modal'
import { getAuditsList, getActiveAgents } from '@/lib/data/audits'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtScore(score: number | null) {
  if (score === null) return '—'
  return `${score.toFixed(0)}%`
}

function scoreColor(score: number | null) {
  if (score === null) return ''
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    complete: 'bg-emerald-100 text-emerald-700',
    running: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export default async function AuditsPage() {
  noStore()
  const [audits, agents] = await Promise.all([getAuditsList(), getActiveAgents()])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Call Quality Audits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Score calls against the Voxa 30-criterion DNA framework.
          </p>
        </div>
        <NewAuditModal agents={agents} />
      </div>

      {audits.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">No audits yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click "New Audit" to score an agent's calls against the Voxa framework.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {audits.map(audit => (
            <Link key={audit.id} href={`/audits/${audit.id}`}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {audit.agent_name ?? 'Unknown Agent'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(audit.date_range_start)}
                          {audit.date_range_end && audit.date_range_end !== audit.date_range_start
                            ? ` — ${fmtDate(audit.date_range_end)}`
                            : ''}
                          {audit.calls_scored ? ` · ${audit.calls_scored} call${audit.calls_scored !== 1 ? 's' : ''}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={audit.status} />
                      <span className={`text-lg font-bold tabular-nums ${scoreColor(audit.overall_score)}`}>
                        {fmtScore(audit.overall_score)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run build check**

```bash
npm run build 2>&1 | head -50
```

Expected: No errors. Fix any before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/app/audits/page.tsx src/lib/data/audits.ts
git commit -m "feat: build audits list page with NewAuditModal"
```

---

## Task 10: Audit Detail Page

**Files:**
- Create: `src/app/audits/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/audits/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck, User, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScorecardAccordion } from '@/components/audits/scorecard-accordion'
import { getAuditDetail } from '@/lib/data/audits'

function scoreColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const audit = await getAuditDetail(id)
  if (!audit) notFound()

  const lowestSection = audit.section_scores
    .filter(s => s.applicable_count > 0)
    .sort((a, b) => a.score_pct - b.score_pct)[0]

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
        href="/audits"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Audits
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          Quality Audit — {audit.agent_name ?? 'Unknown Agent'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {fmtDate(audit.date_range_start)}
          {audit.date_range_end && audit.date_range_end !== audit.date_range_start
            ? ` — ${fmtDate(audit.date_range_end)}`
            : ''}
          {' · '}
          {audit.calls_scored ?? 0} call{audit.calls_scored !== 1 ? 's' : ''} scored
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className={`text-3xl font-bold tabular-nums ${audit.overall_score !== null ? scoreColor(audit.overall_score) : 'text-muted-foreground'}`}>
              {audit.overall_score !== null ? `${audit.overall_score.toFixed(0)}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {audit.calls_scored ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Calls Scored</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className={`text-lg font-bold ${lowestSection ? scoreColor(lowestSection.score_pct) : 'text-muted-foreground'}`}>
              {lowestSection?.section ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Lowest Section</p>
          </CardContent>
        </Card>
      </div>

      {/* Scorecard accordion */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Scorecard</h2>
        <ScorecardAccordion
          section_scores={audit.section_scores}
          score_rows={audit.score_rows}
          call_count={audit.calls_scored ?? 1}
        />
      </div>

      {/* Feedback */}
      {(audit.strengths?.length || audit.coaching_opportunities?.length) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {audit.strengths && audit.strengths.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-800">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {audit.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-emerald-900">• {s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {audit.coaching_opportunities && audit.coaching_opportunities.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-800">Coaching Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {audit.coaching_opportunities.map((c, i) => (
                    <li key={i} className="text-sm text-amber-900">• {c}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Manager talking points */}
      {audit.manager_talking_points && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Manager Talking Points</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-muted pl-3">
              {audit.manager_talking_points}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Calls list */}
      {audit.scored_call_ids.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2">Calls Scored</h2>
          <div className="space-y-1">
            {audit.scored_call_ids.map(callId => (
              <Link
                key={callId}
                href={`/calls/${callId}`}
                className="block text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                {callId}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run build check**

```bash
npm run build 2>&1 | head -50
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/audits/[id]/page.tsx
git commit -m "feat: build audit detail page with scorecard accordion"
```

---

## Task 11: "Audit this call" Button on Call Detail Page

**Files:**
- Modify: `src/app/calls/[id]/page.tsx`
- Create: `src/components/audits/audit-call-button.tsx`

The call detail page is a Server Component — the interactive modal trigger needs to be a small Client Component wrapper.

- [ ] **Step 1: Create `src/components/audits/audit-call-button.tsx`**

```tsx
'use client'

import { ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewAuditModal } from './new-audit-modal'

type Agent = { id: string; display_name: string }

type Props = {
  callId: string
  agentId: string | null
  agents: Agent[]
}

export function AuditCallButton({ callId, agentId, agents }: Props) {
  if (!agentId) return null

  return (
    <NewAuditModal
      agents={agents}
      lockedCallId={callId}
      lockedAgentId={agentId}
      trigger={
        <Button variant="outline" size="sm">
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Audit this call
        </Button>
      }
    />
  )
}
```

- [ ] **Step 2: Add agents fetch to call detail page and render button**

In `src/app/calls/[id]/page.tsx`, add these changes:

At the top of the file, add the import:
```typescript
import { getActiveAgents } from '@/lib/data/audits'
import { AuditCallButton } from '@/components/audits/audit-call-button'
```

In the `CallDetailPage` function, add the agents fetch alongside the existing call fetch:
```typescript
// Change this line:
const call = await getCallDetail(id);

// To this:
const [call, agents] = await Promise.all([
  getCallDetail(id),
  getActiveAgents(),
])
```

Then find the page header section (the `div` with `flex-wrap items-start justify-between`) and add the button inside it. Look for the existing `div className="flex flex-wrap items-start justify-between gap-3"` block. Inside it, after the title/subtitle `div`, add:

```tsx
<AuditCallButton
  callId={call.id}
  agentId={/* the confirmed or inferred agent id */null}
  agents={agents}
/>
```

> **Note on agentId:** The `calls` table has `agent_id` (confirmed UUID) and `agent_name_inferred` (text). The `getCallDetail` function currently doesn't fetch `agent_id`. Add `agent_id` to the select query in `src/lib/data/call-detail.ts`:
>
> In `getCallDetail`, find the `supabase.from('calls').select(...)` call and add `agent_id` to the field list:
> ```
> id, call_time_ct, call_date, direction, from_name, from_number,
> dialed_number, to_extension, orig_id, call_id_portal,
> agent_id, agent_name_inferred, duration_seconds, processing_status,
> ```
> Also add `agent_id: r.agent_id as string | null` to the `CallDetailData` type and the return object.
> Then pass `call.agent_id` to the `AuditCallButton`.

- [ ] **Step 3: Run build check**

```bash
npm run build 2>&1 | head -50
```

Expected: No errors. Fix any type issues.

- [ ] **Step 4: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: All tests pass (31 existing + new audit-scoring + audit-prompt tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/audits/audit-call-button.tsx src/app/calls/[id]/page.tsx src/lib/data/call-detail.ts
git commit -m "feat: add 'Audit this call' button to call detail page"
```

---

## Task 12: Manual End-to-End Smoke Test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test the audits list page**

Open http://localhost:3000/audits. Expected: page loads, shows empty state with "New Audit" button. No console errors.

- [ ] **Step 3: Test the audit modal — preview count**

Click "New Audit". Select an agent and a date range that has real calls (e.g., June 1, 2026). Expected: call count preview appears ("X eligible calls found").

- [ ] **Step 4: Run a single-call audit**

Navigate to http://localhost:3000/calls and open a call that has `processing_status: complete` and a transcript. Click "Audit this call". Click "Run Audit". Expected: loading spinner appears, then redirect to `/audits/[id]` with scorecard populated.

- [ ] **Step 5: Verify scorecard output**

On the audit detail page: overall score should be in the 65–95% range. If it reads below 55%, the prompt calibration needs tuning — check the Claude response by adding `console.log` to the route, look at what flags came back for well-known criteria like "Unique Greeting" and "Positive Energy".

- [ ] **Step 6: Test the multi-call audit**

From the Audits list page, click "New Audit", pick agent + date range with 3–5 calls. Run it. Verify it completes and shows aggregate section scores.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete Chunk 12 call quality audits (Voxa DNA scoring)"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Both audit entry points (Audits page + call detail button)
- ✅ Synchronous loading with spinner
- ✅ Up to 25 calls, batches of 5
- ✅ Yes/GA/No/NA scoring (not 0–5 scale)
- ✅ NA excluded from denominator
- ✅ Supportive-manager prompt framing + 55% recalibration check
- ✅ Rubric lazy-seeded in DB on first run
- ✅ Section accordion UI with color coding
- ✅ Strengths + coaching opportunities + manager talking points
- ✅ Calls list at bottom of audit detail
- ✅ Audits list page with status + score
- ✅ 30 criteria (not 24 — updated from PDF review)
- ✅ agent_id field added to CallDetailData for the Audit button

**Type consistency:**
- `CriterionResult` defined in `audit-scoring.ts`, imported in `audit-prompt.test.ts` and `route.ts` ✅
- `SectionScore` defined in `audit-scoring.ts`, used in `audits.ts` data layer ✅
- `AggregateResult` defined in `audit-scoring.ts`, used in `audit-prompt.ts` ✅
- `AgentRow` defined in `audits.ts`, used in page components ✅

**Known limitation:** The `call_quality_audits` table has no `error_message` column — Task 5 notes to remove that field from the failed-state update if it causes a DB error.
