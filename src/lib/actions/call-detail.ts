'use server'

import { getCallDetail } from '@/lib/data/call-detail'
import type { CallDetailData } from '@/lib/data/call-detail'

export async function getCallDetailAction(id: string): Promise<CallDetailData | null> {
  return getCallDetail(id)
}
