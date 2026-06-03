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
