'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Agent = { id: string; display_name: string }

type Props = {
  agents: Agent[]
  /** Pre-fill and lock to a specific call (single-call audit from call detail page) */
  lockedCallId?: string
  lockedAgentId?: string
  trigger?: React.ReactNode
}

export function NewAuditModal({ agents, lockedCallId, lockedAgentId, trigger }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [agentId, setAgentId] = useState(lockedAgentId ?? agents[0]?.id ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [callCount, setCallCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLocked = !!lockedCallId

  const fetchCallCount = useCallback(async () => {
    if (isLocked) { setCallCount(1); return }
    if (!agentId || !startDate || !endDate) { setCallCount(null); return }

    const displayName = agents.find(a => a.id === agentId)?.display_name ?? ''
    const params = new URLSearchParams({
      agent_name: displayName,
      start_date: startDate,
      end_date: endDate,
    })
    const res = await fetch(`/api/audit/call-count?${params}`)
    const json = await res.json() as { count: number }
    setCallCount(json.count)
  }, [agentId, startDate, endDate, isLocked, agents])

  useEffect(() => {
    fetchCallCount()
  }, [fetchCallCount])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const body = isLocked
      ? { agent_id: agentId, call_ids: [lockedCallId] }
      : { agent_id: agentId, date_range: { start: startDate, end: endDate } }

    try {
      const res = await fetch('/api/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json() as { ok: boolean; audit_id?: string; error?: string }
      if (!json.ok) {
        setError(json.error ?? 'Audit failed')
        setLoading(false)
        return
      }
      setOpen(false)
      router.push(`/audits/${json.audit_id}`)
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  const triggerButton = trigger != null
    ? React.cloneElement(trigger as React.ReactElement<{ onClick?: React.MouseEventHandler }>, {
        onClick: () => setOpen(true),
      })
    : (
      <Button size="sm" onClick={() => setOpen(true)}>
        <ClipboardCheck className="mr-2 h-4 w-4" />
        New Audit
      </Button>
    )

  return (
    <>
      {triggerButton}
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isLocked ? 'Audit This Call' : 'New Quality Audit'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Agent */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="agent">Agent</label>
            <select
              id="agent"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              disabled={isLocked}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              required
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.display_name}</option>
              ))}
            </select>
          </div>

          {/* Date range — hidden when locked to a single call */}
          {!isLocked && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="start">Start Date</label>
                <input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="end">End Date</label>
                <input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* Call count preview */}
          {callCount !== null && (
            <p className="text-sm text-muted-foreground">
              {isLocked
                ? '1 call will be scored against all 30 Voxa criteria.'
                : `${callCount} eligible call${callCount !== 1 ? 's' : ''} found${callCount === 25 ? ' (capped at 25)' : ''}.`}
            </p>
          )}
          {!isLocked && callCount === 0 && startDate && endDate && (
            <p className="text-sm text-amber-600">No completed calls found for this agent in that range.</p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || callCount === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scoring{callCount && callCount > 1 ? ` ${callCount} calls` : ''}…
                </>
              ) : (
                'Run Audit'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
