'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { MIN_CALL_DURATION_SECONDS } from '@/lib/data/constants'

export type RecapCallRow = {
  id: string
  from_name: string | null
  from_number: string | null
  call_time_ct: string | null
  duration_seconds: number | null
  primary_category: string | null
  agent_name_inferred: string | null
}

export type RecapFilter =
  | 'total'
  | 'sales_opps'
  | 'follow_ups'
  | 'complaints'
  | 'bookings'
  | 'cancellations'

export const FILTER_LABELS: Record<RecapFilter, string> = {
  total: 'All Calls',
  sales_opps: 'Sales Opportunities',
  follow_ups: 'Follow-ups',
  complaints: 'Complaints',
  bookings: 'Bookings (Scheduling + Rescheduling)',
  cancellations: 'Cancellations',
}

export async function getRecapCallsAction(
  date: string,
  filter: RecapFilter,
): Promise<RecapCallRow[]> {
  const supabase = createServiceClient()
  const sel =
    'id, from_name, from_number, call_time_ct, duration_seconds, primary_category, agent_name_inferred'

  const base = () =>
    supabase
      .from('calls')
      .select(sel)
      .eq('call_date', date)
      .gt('duration_seconds', MIN_CALL_DURATION_SECONDS)
      .order('call_time_ct', { ascending: true })

  let result
  if (filter === 'sales_opps') result = await base().eq('sales_opportunity_flag', true)
  else if (filter === 'follow_ups') result = await base().eq('follow_up_required', true)
  else if (filter === 'complaints') result = await base().eq('complaint_flag', true)
  else if (filter === 'bookings')
    result = await base().in('primary_category', ['Scheduling', 'Rescheduling'])
  else if (filter === 'cancellations')
    result = await base().eq('primary_category', 'Cancellation / Retention')
  else result = await base()

  return (result.data ?? []) as RecapCallRow[]
}
