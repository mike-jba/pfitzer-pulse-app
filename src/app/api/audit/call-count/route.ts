import 'server-only'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const agentName = searchParams.get('agent_name') ?? ''
  const startDate = searchParams.get('start_date') ?? ''
  const endDate = searchParams.get('end_date') ?? ''

  if (!agentName || !startDate || !endDate) {
    return NextResponse.json({ count: 0 })
  }

  const supabase = createServiceClient()
  const { count, error } = await supabase
    .from('calls')
    .select('id', { count: 'exact', head: true })
    .ilike('agent_name_inferred', `${agentName}%`)
    .eq('processing_status', 'complete')
    .gte('call_date', startDate)
    .lte('call_date', endDate)

  if (error) {
    console.error('[audit/call-count]', error)
    return NextResponse.json({ count: 0 })
  }

  return NextResponse.json({ count: Math.min(count ?? 0, 25) })
}
