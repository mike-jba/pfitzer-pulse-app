'use client'

import { ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewAuditModal } from './new-audit-modal'

type Agent = { id: string; display_name: string }

type Props = {
  callId: string
  agentId: string | null
  agents: Agent[]
}

export function AuditCallButton({ callId, agentId, agents }: Props) {
  if (!agentId) return null

  return (
    <NewAuditModal
      agents={agents}
      lockedCallId={callId}
      lockedAgentId={agentId}
      trigger={
        <Button variant="outline" size="sm">
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Audit this call
        </Button>
      }
    />
  )
}
