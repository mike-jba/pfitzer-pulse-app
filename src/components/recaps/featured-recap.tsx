'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  PhoneCall,
  Clock,
  TrendingUp,
  AlertCircle,
  UserCheck,
  XCircle,
  Tag,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  getRecapCallsAction,
  FILTER_LABELS,
  type RecapCallRow,
  type RecapFilter,
} from '@/lib/actions/recap-calls'
import type { Recap } from '@/components/recaps/recap-history'

// ── Formatters ───────────────────────────────────────────────────

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

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  })
}

function getTopCategory(calls_by_category: Record<string, number> | null): string {
  if (!calls_by_category) return '—'
  const entries = Object.entries(calls_by_category)
  if (entries.length === 0) return '—'
  return entries.sort(([, a], [, b]) => b - a)[0][0]
}

function getCategoryCount(
  calls_by_category: Record<string, number> | null,
  ...keys: string[]
): number {
  if (!calls_by_category) return 0
  return keys.reduce((sum, key) => sum + (calls_by_category[key] ?? 0), 0)
}

// ── Stat tiles ───────────────────────────────────────────────────

function ClickableStat({
  icon,
  label,
  value,
  highlight,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  highlight?: 'green' | 'amber' | 'red'
  onClick: () => void
}) {
  const valueClass =
    highlight === 'green'
      ? 'text-green-700 dark:text-green-400'
      : highlight === 'amber'
        ? 'text-amber-700 dark:text-amber-400'
        : highlight === 'red'
          ? 'text-red-700 dark:text-red-400'
          : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-lg border bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/60"
    >
      <div className="mb-0.5 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-semibold group-hover:underline ${valueClass}`}>{value}</p>
    </button>
  )
}

function StatDisplay({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="mb-0.5 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

// ── FeaturedRecap ────────────────────────────────────────────────

export function FeaturedRecap({ recap }: { recap: Recap }) {
  const [sheetFilter, setSheetFilter] = useState<RecapFilter | null>(null)
  const [sheetCalls, setSheetCalls] = useState<RecapCallRow[]>([])
  const [sheetLoading, setSheetLoading] = useState(false)

  async function openSheet(filter: RecapFilter) {
    setSheetFilter(filter)
    setSheetLoading(true)
    setSheetCalls([])
    const calls = await getRecapCallsAction(recap.recap_date, filter)
    setSheetCalls(calls)
    setSheetLoading(false)
  }

  function closeSheet() {
    setSheetFilter(null)
    setSheetCalls([])
  }

  const topCategory = getTopCategory(recap.calls_by_category)
  const bookings = getCategoryCount(recap.calls_by_category, 'Scheduling', 'Rescheduling')
  const cancellations = getCategoryCount(recap.calls_by_category, 'Cancellation / Retention')

  const categoryEntries = recap.calls_by_category
    ? Object.entries(recap.calls_by_category).sort(([, a], [, b]) => b - a)
    : []

  return (
    <>
      <div className="space-y-4">
        {/* Date heading + generated time */}
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">{formatDate(recap.recap_date)}</h2>
          {recap.generated_at && (
            <span className="text-xs text-muted-foreground">
              Generated{' '}
              {new Date(recap.generated_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZone: 'America/Chicago',
              })}{' '}
              CT
            </span>
          )}
        </div>

        {/* 7-stat grid — clickable stats open filtered call list */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <ClickableStat
            icon={<PhoneCall className="h-3.5 w-3.5" />}
            label="Total Calls"
            value={recap.total_calls ?? '—'}
            onClick={() => openSheet('total')}
          />
          <StatDisplay
            icon={<Tag className="h-3.5 w-3.5" />}
            label="Top Category"
            value={topCategory}
          />
          <ClickableStat
            icon={<UserCheck className="h-3.5 w-3.5 text-blue-600" />}
            label="Bookings"
            value={bookings}
            onClick={() => openSheet('bookings')}
          />
          <ClickableStat
            icon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
            label="Cancellations"
            value={cancellations}
            onClick={() => openSheet('cancellations')}
          />
          <StatDisplay
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Avg Duration"
            value={formatDuration(recap.avg_duration_seconds)}
          />
          <ClickableStat
            icon={<TrendingUp className="h-3.5 w-3.5 text-green-600" />}
            label="Sales Opps"
            value={recap.sales_opportunities_count ?? 0}
            highlight="green"
            onClick={() => openSheet('sales_opps')}
          />
          <ClickableStat
            icon={<AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
            label="Follow-ups"
            value={recap.follow_up_count ?? 0}
            highlight="amber"
            onClick={() => openSheet('follow_ups')}
          />
        </div>

        {/* Complaints quick flag — clickable */}
        {(recap.complaints_count ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => openSheet('complaints')}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {recap.complaints_count} complaint{recap.complaints_count !== 1 ? 's' : ''} — click to
            review calls
          </button>
        )}

        {/* AI narrative summary */}
        {recap.summary_text && (
          <p className="border-l-2 border-muted pl-3 text-sm leading-relaxed text-muted-foreground">
            {recap.summary_text}
          </p>
        )}

        {/* Category breakdown */}
        {categoryEntries.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Calls by Category</p>
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
            <p className="mb-2 text-xs font-medium text-muted-foreground">Top Tags</p>
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
            <p className="mb-2 text-xs font-medium text-muted-foreground">By Agent</p>
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
      </div>

      {/* Filtered calls sheet */}
      <Sheet open={sheetFilter !== null} onOpenChange={(open) => { if (!open) closeSheet() }}>
        <SheetContent side="right" className="data-[side=right]:sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-sm leading-snug">
              {sheetFilter ? FILTER_LABELS[sheetFilter] : ''}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">{formatDate(recap.recap_date)}</p>
          </SheetHeader>
          <div className="p-4">
            {sheetLoading ? (
              <p className="text-sm text-muted-foreground">Loading calls…</p>
            ) : sheetCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">No calls found.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="mb-3 text-xs text-muted-foreground">
                  {sheetCalls.length} call{sheetCalls.length !== 1 ? 's' : ''}
                </p>
                {sheetCalls.map((call) => (
                  <Link
                    key={call.id}
                    href={`/calls/${call.id}`}
                    className="group flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {call.from_name ?? call.from_number ?? 'Unknown'}
                        </span>
                        {call.primary_category && (
                          <Badge variant="secondary" className="shrink-0 text-[11px]">
                            {call.primary_category}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        {call.call_time_ct && <span>{fmtTime(call.call_time_ct)}</span>}
                        {call.duration_seconds != null && (
                          <span>{formatDuration(call.duration_seconds)}</span>
                        )}
                        {call.agent_name_inferred && <span>{call.agent_name_inferred}</span>}
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
