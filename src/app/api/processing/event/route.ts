import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { validateIngestAuth } from '@/lib/api/ingest-auth'
import { processingStatusSchema } from '@/lib/api/schemas'

const BodySchema = z.object({
  call_id: z.string().uuid().nullish(),
  import_batch_id: z.string().uuid().nullish(),
  event_type: z.enum(['status_change', 'error', 'retry', 'info']),
  from_status: processingStatusSchema.optional(),
  to_status: processingStatusSchema.optional(),
  message: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
    .from('processing_events')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) {
    console.error('[processing/event]', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: (data as { id: string }).id })
}
