import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { validateIngestAuth } from '@/lib/api/ingest-auth'

const BodySchema = z.object({
  recap_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  total_calls: z.number().int().nonnegative().optional(),
  inbound_count: z.number().int().nonnegative().optional(),
  outbound_count: z.number().int().nonnegative().optional(),
  avg_duration_seconds: z.number().nonnegative().nullable().optional(),
  complaints_count: z.number().int().nonnegative().optional(),
  follow_up_count: z.number().int().nonnegative().optional(),
  sales_opportunities_count: z.number().int().nonnegative().optional(),
  calls_by_category: z.record(z.string(), z.number()).nullable().optional(),
  calls_by_agent: z.record(z.string(), z.number()).nullable().optional(),
  top_tags: z.array(z.object({ tag: z.string(), count: z.number() })).nullable().optional(),
  summary_text: z.string().nullable().optional(),
  html_body: z.string().nullable().optional(),
  plain_text_body: z.string().nullable().optional(),
  generated_at: z.string().optional(),
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

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('daily_recaps')
    .upsert(
      { ...parsed.data, generated_at: parsed.data.generated_at ?? new Date().toISOString() },
      { onConflict: 'recap_date' },
    )
    .select('id, recap_date')
    .single()

  if (error) {
    console.error('[ingest/recap]', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: (data as { id: string }).id, recap_date: parsed.data.recap_date })
}
