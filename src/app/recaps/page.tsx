import { unstable_noStore as noStore } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { PhoneCall, AlertCircle, UserCheck, XCircle, FileText } from 'lucide-react'
import { RecapHistory, RecapCard, Stat, type Recap } from '@/components/recaps/recap-history'

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

function getTopCategory(calls_by_category: Record<string, number> | null): string {
  if (!calls_by_category) return '—'
  const entries = Object.entries(calls_by_category)
  if (entries.length === 0) return '—'
  const [topCat] = entries.sort(([, a], [, b]) => b - a)[0]
  return topCat
}

function getCategoryCount(
  calls_by_category: Record<string, number> | null,
  ...keys: string[]
): number {
  if (!calls_by_category) return 0
  return keys.reduce((sum, key) => sum + (calls_by_category[key] ?? 0), 0)
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
        (() => {
          const [featured, ...rest] = recaps

          // Derive stats from featured recap's structured fields
          const topCategory = getTopCategory(featured.calls_by_category)
          const bookings = getCategoryCount(
            featured.calls_by_category,
            'Scheduling',
            'Rescheduling',
          )
          const cancellations = getCategoryCount(
            featured.calls_by_category,
            'Cancellation / Retention',
          )

          return (
            <div className="space-y-6">
              {/* ── Latest ─────────────────────────────────── */}
              <section className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Latest
                </p>

                {/* Stats card */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat
                    icon={<PhoneCall className="h-3.5 w-3.5" />}
                    label="Total Calls"
                    value={featured.total_calls ?? '—'}
                  />
                  <Stat
                    icon={<span className="h-3.5 w-3.5 text-[10px] font-bold leading-none">#1</span>}
                    label="Top Category"
                    value={topCategory}
                  />
                  <Stat
                    icon={<UserCheck className="h-3.5 w-3.5 text-blue-600" />}
                    label="Bookings"
                    value={bookings}
                  />
                  <Stat
                    icon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
                    label="Cancellations"
                    value={cancellations}
                  />
                </div>

                {/* Complaints quick flag */}
                {(featured.complaints_count ?? 0) > 0 && (
                  <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {featured.complaints_count} complaint
                    {featured.complaints_count !== 1 ? 's' : ''} — review recordings
                  </div>
                )}

                {/* Full featured recap narrative */}
                <RecapCard recap={featured} />
              </section>

              {/* ── Past 30 Days ────────────────────────────── */}
              {rest.length > 0 && (
                <section className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Past 30 Days
                  </p>
                  <RecapHistory recaps={rest} />
                </section>
              )}
            </div>
          )
        })()
      )}
    </div>
  )
}
