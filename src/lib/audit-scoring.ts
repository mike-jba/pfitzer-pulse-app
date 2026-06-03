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
