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

  const { data: auditData, error: auditError } = auditResult
  if (auditError || !auditData) return null

  const row = auditData as Record<string, unknown>
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
