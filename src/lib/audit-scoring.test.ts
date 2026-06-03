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
    flag: 'Yes' as const,
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
