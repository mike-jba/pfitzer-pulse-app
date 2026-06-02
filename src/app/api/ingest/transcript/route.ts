import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { validateIngestAuth } from '@/lib/api/ingest-auth'

const BodySchema = z.object({
  call_id: z.string().uuid(),
  transcript_text: z.string(),
  transcript_json: z.record(z.string(), z.unknown()).optional(),   // full Deepgram response
  duration_seconds: z.number().nonnegative().optional(),
  speaker_count: z.number().int().nonnegative().optional(),
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

  const { call_id, ...transcriptFields } = parsed.data
  const supabase = createServiceClient()

  const { data, error: transcriptError } = await supabase
    .from('call_transcripts')
    .upsert(
      { call_id, ...transcriptFields, provider: 'deepgram' },
      { onConflict: 'call_id' },
    )
    .select('id')
    .single()

  if (transcriptError) {
    console.error('[ingest/transcript]', transcriptError)
    return NextResponse.json({ ok: false, error: transcriptError.message }, { status: 500 })
  }

  // Advance pipeline status — non-fatal if this fails (transcript already saved)
  const { error: statusError } = await supabase
    .from('calls')
    .update({ processing_status: 'transcribed' })
    .eq('id', call_id)

  if (statusError) {
    console.error('[ingest/transcript] status update', statusError)
  }

  return NextResponse.json({ ok: true, id: (data as { id: string }).id })
}
