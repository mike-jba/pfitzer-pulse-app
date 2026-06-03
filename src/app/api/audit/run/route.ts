import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { VOXA_CRITERIA, VOXA_RUBRIC_NAME } from '@/lib/voxa-rubric'
import { buildScoringPrompt, buildSynthesisPrompt } from '@/lib/audit-prompt'
import { computeCallScore, aggregateScores } from '@/lib/audit-scoring'
import type { CriterionResult } from '@/lib/audit-scoring'

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
    rubric_id = (existing as { id: string }).id
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
    resolvedCallIds = (calls ?? []).map((c: Record<string, unknown>) => c.id as string)
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

    // 8. Persist scores
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

    // 9. Update audit record to complete
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
    // Update status to failed
    await supabase
      .from('call_quality_audits')
      .update({ status: 'failed' })
      .eq('id', audit_id)
    return NextResponse.json({ ok: false, error: 'Scoring failed' }, { status: 500 })
  }
}
