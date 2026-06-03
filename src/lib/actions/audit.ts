'use server'

import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { VOXA_CRITERIA, VOXA_RUBRIC_NAME } from '@/lib/voxa-rubric'
import { buildScoringPrompt, buildSynthesisPrompt } from '@/lib/audit-prompt'
import { computeCallScore, aggregateScores } from '@/lib/audit-scoring'
import type { CriterionResult } from '@/lib/audit-scoring'

// Note: Vercel function timeout for server actions is controlled by the
// route segment config on the calling page. The default Vercel timeout (10s
// on Hobby, 60s on Pro) applies here. For long-running audits, ensure the
// deploying project is on a plan that supports the required duration.

const RunAuditInputSchema = z.object({
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

export async function runAudit(
  input: { agent_id: string; call_ids?: string[]; date_range?: { start: string; end: string } }
): Promise<{ ok: boolean; audit_id?: string; error?: string }> {
  const parsed = RunAuditInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Validation failed' }
  }

  const { agent_id, call_ids, date_range } = parsed.data
  const supabase = createServiceClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Look up agent display_name early — used for name-based call matching
  // (calls.agent_id is not populated by the pipeline; calls are matched via agent_name_inferred)
  const { data: agentLookup } = await supabase
    .from('agents')
    .select('display_name')
    .eq('id', agent_id)
    .single()
  const agentDisplayName = (agentLookup as { display_name: string } | null)?.display_name ?? ''

  // 1. Ensure Voxa rubric exists in DB (lazy seed)
  let rubric_id: string
  const { data: existing, error: rubricReadError } = await supabase
    .from('call_quality_rubrics')
    .select('id')
    .eq('name', VOXA_RUBRIC_NAME)
    .eq('active', true)
    .maybeSingle()

  if (rubricReadError) {
    console.error('[audit/run] rubric read', rubricReadError)
    return { ok: false, error: 'Failed to read rubric' }
  }

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
      return { ok: false, error: 'Failed to seed rubric' }
    }
    rubric_id = (newRubric as { id: string }).id
  }

  // 2. Resolve call list
  let resolvedCallIds: string[]
  if (call_ids && call_ids.length > 0) {
    const { data: ownedCalls } = await supabase
      .from('calls')
      .select('id')
      .in('id', call_ids)
      .eq('processing_status', 'complete')
    resolvedCallIds = (ownedCalls ?? []).map((c: Record<string, unknown>) => c.id as string)
  } else if (date_range) {
    const { data: calls, error } = await supabase
      .from('calls')
      .select('id')
      .ilike('agent_name_inferred', `${agentDisplayName}%`)
      .eq('processing_status', 'complete')
      .gte('call_date', date_range.start)
      .lte('call_date', date_range.end)
      .limit(25)
    if (error) {
      return { ok: false, error: error.message }
    }
    resolvedCallIds = (calls ?? []).map((c: Record<string, unknown>) => c.id as string)
  } else {
    return { ok: false, error: 'Provide call_ids or date_range' }
  }

  if (resolvedCallIds.length === 0) {
    return { ok: false, error: 'No eligible calls found' }
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
    return { ok: false, error: 'Failed to fetch calls' }
  }

  // Filter to calls that have a non-empty transcript — skip voicemails / processing failures
  const scorableRecords = (callRecords as Record<string, unknown>[]).filter(r => {
    const ct = r.call_transcripts
    // Supabase may return array or object depending on FK detection
    const text = Array.isArray(ct)
      ? (ct[0] as { transcript_text: string | null } | undefined)?.transcript_text
      : (ct as { transcript_text: string | null } | null)?.transcript_text
    return text?.trim()
  })

  if (scorableRecords.length === 0) {
    return { ok: false, error: 'No calls with transcripts found in this range' }
  }

  console.log(`[audit/run] ${resolvedCallIds.length} calls resolved, ${scorableRecords.length} have transcripts`)

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
    return { ok: false, error: 'Failed to create audit' }
  }
  const audit_id = (audit as { id: string }).id

  try {
    // 5. Score each call in parallel batches of 5
    async function scoreCall(record: Record<string, unknown>): Promise<ReturnType<typeof computeCallScore>> {
      const ct = record.call_transcripts
      const transcript = Array.isArray(ct)
        ? (ct[0] as { transcript_text: string | null } | undefined)?.transcript_text ?? ''
        : (ct as { transcript_text: string | null } | null)?.transcript_text ?? ''

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
      if (!jsonMatch) {
        console.error(`[audit/run] No JSON for call ${record.id}. Raw response (first 500 chars):`, raw.slice(0, 500))
        throw new Error(`No JSON in Claude response for call ${record.id}: ${raw.slice(0, 200)}`)
      }

      const parsedCriteria = JSON.parse(jsonMatch[0]) as { criteria: unknown[] }
      const criteria: CriterionResult[] = parsedCriteria.criteria
        .map((c: unknown) => CriterionResultSchema.safeParse(c))
        .filter(r => r.success)
        .map(r => (r as { success: true; data: CriterionResult }).data)

      return computeCallScore(record.id as string, criteria)
    }

    const BATCH_SIZE = 5
    const callScores: ReturnType<typeof computeCallScore>[] = []
    for (let i = 0; i < scorableRecords.length; i += BATCH_SIZE) {
      const batch = scorableRecords.slice(i, i + BATCH_SIZE)
      console.log(`[audit/run] scoring batch ${Math.floor(i / BATCH_SIZE) + 1}, calls ${i + 1}–${Math.min(i + BATCH_SIZE, scorableRecords.length)}`)
      const batchResults = await Promise.all(batch.map(r => scoreCall(r)))
      callScores.push(...batchResults)
    }

    // 6. Aggregate
    const aggregate = aggregateScores(callScores)

    // 7. Synthesis
    const agent_name = agentDisplayName || 'Agent'

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
      const { error: scoresError } = await supabase.from('call_quality_scores').insert(scoreRows)
      if (scoresError) throw new Error(`Failed to insert scores: ${scoresError.message}`)
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

    return { ok: true, audit_id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[audit/run]', msg)
    await supabase
      .from('call_quality_audits')
      .update({ status: 'failed' })
      .eq('id', audit_id)
    return { ok: false, error: msg }
  }
}

export async function getAuditCallCount(
  input: { agent_name: string; start_date: string; end_date: string }
): Promise<number> {
  const { agent_name, start_date, end_date } = input

  if (!agent_name || !start_date || !end_date) {
    return 0
  }

  const supabase = createServiceClient()
  const { count, error } = await supabase
    .from('calls')
    .select('id', { count: 'exact', head: true })
    .ilike('agent_name_inferred', `${agent_name}%`)
    .eq('processing_status', 'complete')
    .gte('call_date', start_date)
    .lte('call_date', end_date)

  if (error) {
    console.error('[audit/call-count]', error)
    return 0
  }

  return Math.min(count ?? 0, 25)
}
