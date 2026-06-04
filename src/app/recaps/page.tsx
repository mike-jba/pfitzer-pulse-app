import { unstable_noStore as noStore } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, TrendingUp, AlertCircle, PhoneCall, Clock } from 'lucide-react'

type Recap = {
  id: string
  recap_date: string
  total_calls: number | null
  avg_duration_seconds: number | null
  complaints_count: number | null
  follow_up_count: number | null
  sales_opportunities_count: number | null
  calls_by_category: Record<string, number> | null
  calls_by_agent: Record<string, number> | null
  top_tags: { tag: string; count: number }[] | null
  summary_text: string | null
  generated_at: string | null
}

async function getRecaps(): Promise<Recap[]> {
  noStore()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('daily_recaps')
    .select(
      'id, recap_date, total_calls, avg_duration_seconds, complaints_count, follow_up_count, sales_opportunities_count, calls_by_category, calls_by_agent, top_tags, summary_text, generated_at',
    )
    .order('recap_date', { ascending: false })
    .limit(30)

  if (error) {
    console.error('[recaps]', error)
    return []
  }
  return (data ?? []) as Recap[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export default async function RecapsPage() {
  const recaps = await getRecaps()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Daily Recaps</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically generated each evening after call processing completes.
        </p>
      </div>

      {recaps.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">No recaps yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recaps are generated nightly after the call pipeline finishes.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recaps.map((recap) => (
            <RecapCard key={recap.id} recap={recap} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecapCard({ recap }: { recap: Recap }) {
  const categoryEntries = recap.calls_by_category
    ? Object.entries(recap.calls_by_category).sort(([, a], [, b]) => b - a)
    : []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {formatDate(recap.recap_date)}
          </CardTitle>
          {recap.generated_at && (
            <span className="text-xs text-muted-foreground">
              Generated {new Date(recap.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })} CT
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<PhoneCall className="h-3.5 w-3.5" />} label="Total Calls" value={recap.total_calls ?? '—'} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Avg Duration" value={formatDuration(recap.avg_duration_seconds)} />
          <Stat icon={<TrendingUp className="h-3.5 w-3.5 text-green-600" />} label="Sales Opps" value={recap.sales_opportunities_count ?? 0} highlight="green" />
          <Stat icon={<AlertCircle className="h-3.5 w-3.5 text-amber-500" />} label="Follow-ups" value={recap.follow_up_count ?? 0} highlight="amber" />
        </div>

        {/* Summary narrative */}
        {recap.summary_text && (
          <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-muted pl-3">
            {recap.summary_text}
          </p>
        )}

        {/* Category breakdown */}
        {categoryEntries.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Calls by Category</p>
            <div className="flex flex-wrap gap-1.5">
              {categoryEntries.map(([cat, count]) => (
                <Badge key={cat} variant="secondary" className="text-xs font-normal">
                  {cat} <span className="ml-1 font-semibold">{count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top tags */}
        {recap.top_tags && recap.top_tags.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Top Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {recap.top_tags.slice(0, 8).map(({ tag, count }) => (
                <Badge key={tag} variant="outline" className="text-xs font-normal">
                  {tag} <span className="ml-1 text-muted-foreground">×{count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Agent breakdown */}
        {recap.calls_by_agent && Object.keys(recap.calls_by_agent).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">By Agent</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(recap.calls_by_agent)
                .sort(([, a], [, b]) => b - a)
                .map(([agent, count]) => (
                  <Badge key={agent} variant="secondary" className="text-xs font-normal">
                    {agent} <span className="ml-1 font-semibold">{count}</span>
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Complaints flag */}
        {(recap.complaints_count ?? 0) > 0 && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {recap.complaints_count} complaint{recap.complaints_count !== 1 ? 's' : ''} logged — review call recordings
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  highlight?: 'green' | 'amber'
}) {
  const valueClass =
    highlight === 'green'
      ? 'text-green-700 dark:text-green-400'
      : highlight === 'amber'
        ? 'text-amber-700 dark:text-amber-400'
        : ''

  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}
