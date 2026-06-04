import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { ClipboardCheck, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { NewAuditModal } from '@/components/audits/new-audit-modal'
import { getAuditsList, getActiveAgents } from '@/lib/data/audits'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtScore(score: number | null) {
  if (score === null) return '—'
  return `${score.toFixed(0)}%`
}

function scoreColor(score: number | null) {
  if (score === null) return ''
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    complete: 'bg-emerald-100 text-emerald-700',
    running: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export default async function AuditsPage() {
  noStore()
  const [audits, agents] = await Promise.all([getAuditsList(), getActiveAgents()])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Call Quality Audits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Score calls against the Voxa 30-criterion DNA framework.
          </p>
        </div>
        <NewAuditModal agents={agents} />
      </div>

      {audits.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardCheck className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">No audits yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click &quot;New Audit&quot; to score an agent&apos;s calls against the Voxa framework.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {audits.map(audit => (
            <Link key={audit.id} href={`/audits/${audit.id}`}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {audit.agent_name ?? 'Unknown Agent'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(audit.date_range_start)}
                          {audit.date_range_end && audit.date_range_end !== audit.date_range_start
                            ? ` — ${fmtDate(audit.date_range_end)}`
                            : ''}
                          {audit.calls_scored ? ` · ${audit.calls_scored} call${audit.calls_scored !== 1 ? 's' : ''}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={audit.status} />
                      <span className={`text-lg font-bold tabular-nums ${scoreColor(audit.overall_score)}`}>
                        {fmtScore(audit.overall_score)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
