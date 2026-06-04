import { unstable_noStore as noStore } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'
import { FeaturedRecap } from '@/components/recaps/featured-recap'
import { RecapHistory, type Recap } from '@/components/recaps/recap-history'

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

export default async function RecapsPage() {
  const recaps = await getRecaps()
  const [featured, ...rest] = recaps

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
        <div className="space-y-6">
          {/* ── Latest recap ────────────────────────────── */}
          <Card>
            <CardContent className="pt-4">
              <FeaturedRecap recap={featured} />
            </CardContent>
          </Card>

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
      )}
    </div>
  )
}
