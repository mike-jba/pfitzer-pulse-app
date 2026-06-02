import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { validateIngestAuth } from '@/lib/api/ingest-auth'
import { buildCallRecord } from '@/lib/parsers/call-metadata'

// n8n sends the raw portal fields; we run buildCallRecord here so parsing
// logic stays in one canonical place (the TypeScript parser, not a Code node).
const BodySchema = z.object({
  orig_id: z.string(),
  call_id: z.string(),                               // term_id from portal
  from_name: z.string().optional(),
  from_number: z.string().optional(),
  dialed_number: z.string().optional(),
  to_extension: z.string().optional(),
  duration_seconds: z.number().int().nonnegative().optional(),
  filename: z.string().optional(),
  import_batch_id: z.string().uuid().nullish(),
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

  const { import_batch_id, ...portalRow } = parsed.data
  const metadata = buildCallRecord(portalRow)

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('calls')
    .upsert(
      {
        ...metadata,
        import_batch_id: import_batch_id ?? null,
        processing_status: 'metadata_saved',
      },
      { onConflict: 'call_id_portal' },
    )
    .select('id')
    .single()

  if (error) {
    console.error('[ingest/call]', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: (data as { id: string }).id })
}
