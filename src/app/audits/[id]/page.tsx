import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScorecardAccordion } from '@/components/audits/scorecard-accordion'
import { getAuditDetail } from '@/lib/data/audits'

function scoreColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const audit = await getAuditDetail(id)
  if (!audit) notFound()

  const lowestSection = audit.section_scores
    .filter(s => s.applicable_count > 0)
    .sort((a, b) => a.score_pct - b.score_pct)[0]

  return (
    <div className="space-y-4">
      <Link
        href="/audits"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Audits
      </Link>

      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          Quality Audit — {audit.agent_name ?? 'Unknown Agent'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {fmtDate(audit.date_range_start)}
          {audit.date_range_end && audit.date_range_end !== audit.date_range_start
            ? ` — ${fmtDate(audit.date_range_end)}`
            : ''}
          {' · '}
          {audit.calls_scored ?? 0} call{audit.calls_scored !== 1 ? 's' : ''} scored
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className={`text-3xl font-bold tabular-nums ${audit.overall_score !== null ? scoreColor(audit.overall_score) : 'text-muted-foreground'}`}>
              {audit.overall_score !== null ? `${audit.overall_score.toFixed(0)}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {audit.calls_scored ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Calls Scored</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className={`text-lg font-bold ${lowestSection ? scoreColor(lowestSection.score_pct) : 'text-muted-foreground'}`}>
              {lowestSection?.section ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Lowest Section</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Scorecard</h2>
        <ScorecardAccordion
          section_scores={audit.section_scores}
          score_rows={audit.score_rows}
          call_count={audit.calls_scored ?? 1}
        />
      </div>

      {(audit.strengths?.length || audit.coaching_opportunities?.length) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {audit.strengths && audit.strengths.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-800">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {audit.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-emerald-900">• {s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {audit.coaching_opportunities && audit.coaching_opportunities.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-800">Coaching Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {audit.coaching_opportunities.map((c, i) => (
                    <li key={i} className="text-sm text-amber-900">• {c}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {audit.manager_talking_points && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Manager Talking Points</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-muted pl-3">
              {audit.manager_talking_points}
            </p>
          </CardContent>
        </Card>
      )}

      {audit.scored_call_ids.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2">Calls Scored</h2>
          <div className="space-y-1">
            {audit.scored_call_ids.map(callId => (
              <Link
                key={callId}
                href={`/calls/${callId}`}
                className="block text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                {callId}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
