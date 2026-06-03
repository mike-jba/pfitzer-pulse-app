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
