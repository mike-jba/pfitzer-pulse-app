import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { validateIngestAuth } from '@/lib/api/ingest-auth'
import { primaryCategorySchema, callSentimentSchema } from '@/lib/api/schemas'

const BodySchema = z.object({
  call_id: z.string().uuid(),

  // AI provenance
  model: z.string().optional(),

  // Summaries
  short_summary: z.string().optional(),
  detailed_summary: z.string().optional(),

  // Classification
  primary_category: primaryCategorySchema.optional(),
  secondary_categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  pest_types: z.array(z.string()).optional(),

  // Signals
  sentiment: callSentimentSchema.optional(),
  follow_up_required: z.boolean().optional(),
  complaint_flag: z.boolean().optional(),
  sales_opportunity_flag: z.boolean().optional(),

  // Speaker identification
  customer_name_inferred: z.string().nullable().optional(),
  agent_name_inferred: z.string().nullable().optional(),

  // Confidence
  confidence_score: z.number().min(0).max(1).optional(),
  reasoning_notes: z.string().optional(),

  // Token cost tracking
  input_tokens: z.number().int().nonnegative().optional(),
  output_tokens: z.number().int().nonnegative().optional(),
  cost_usd: z.number().nonnegative().optional(),

  // Full raw Claude response (for debugging and reprocessing)
  raw_response: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: Request) {
  if (!validateIngestAuth(request)) {
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

  const { call_id, ...analysisFields } = parsed.data
  const supabase = createServiceClient()

  const { data, error: analysisError } = await supabase
    .from('call_analysis')
    .upsert(
      { call_id, ...analysisFields },
      { onConflict: 'call_id' },
    )
    .select('id')
    .single()

  if (analysisError) {
    console.error('[ingest/analysis]', analysisError)
    return NextResponse.json({ ok: false, error: analysisError.message }, { status: 500 })
  }

  // Denormalize key signals back to calls for fast dashboard queries.
  // Also marks the call complete. Non-fatal if this update fails.
  const { error: callsError } = await supabase
    .from('calls')
    .update({
      processing_status: 'complete',
      primary_category: analysisFields.primary_category ?? null,
      sentiment: analysisFields.sentiment ?? 'unknown',
      follow_up_required: analysisFields.follow_up_required ?? false,
      complaint_flag: analysisFields.complaint_flag ?? false,
      sales_opportunity_flag: analysisFields.sales_opportunity_flag ?? false,
      agent_name_inferred: analysisFields.agent_name_inferred ?? null,
    })
    .eq('id', call_id)

  if (callsError) {
    console.error('[ingest/analysis] calls denorm update', callsError)
  }

  return NextResponse.json({ ok: true, id: (data as { id: string }).id })
}
