'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { SectionScore } from '@/lib/audit-scoring'

type Props = {
  section_scores: SectionScore[]
  score_rows: {
    call_id: string
    rubric_criterion_id: string
    score: number | null
    max_score: number | null
    transcript_evidence: string | null
  }[]
  call_count: number
}

function scoreColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function scoreBg(pct: number): string {
  if (pct >= 80) return 'bg-emerald-50 border-emerald-200'
  if (pct >= 60) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

function FlagBadge({ score, maxScore }: { score: number | null; maxScore: number | null }) {
  if (score === null || maxScore === null) {
    return <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">N/A</span>
  }
  if (score === 1) return <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">Yes</span>
  if (score === 0.5) return <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">GA</span>
  return <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">No</span>
}

export function ScorecardAccordion({ section_scores, score_rows, call_count }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(section: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }

  // Build a lookup: criterion_id → array of score rows (one per call)
  const criterionRowMap = new Map<string, typeof score_rows>()
  for (const row of score_rows) {
    const existing = criterionRowMap.get(row.rubric_criterion_id) ?? []
    existing.push(row)
    criterionRowMap.set(row.rubric_criterion_id, existing)
  }

  return (
    <div className="space-y-2">
      {section_scores.map(section => {
        const isOpen = expanded.has(section.section)
        const hasScore = section.applicable_count > 0

        return (
          <div
            key={section.section}
            className={`rounded-lg border overflow-hidden ${hasScore ? scoreBg(section.score_pct) : 'bg-muted/30 border-border'}`}
          >
            {/* Section header — always visible */}
            <button
              type="button"
              onClick={() => toggle(section.section)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                {isOpen
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-semibold">{section.section}</span>
                <span className="text-xs text-muted-foreground">
                  ({section.criteria_aggregates.length} criteria)
                </span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${hasScore ? scoreColor(section.score_pct) : 'text-muted-foreground'}`}>
                {hasScore ? `${section.score_pct.toFixed(0)}%` : '—'}
              </span>
            </button>

            {/* Section body — expanded */}
            {isOpen && (
              <div className="border-t bg-background/60">
                {section.criteria_aggregates.map(crit => {
                  const rows = criterionRowMap.get(String(crit.id)) ?? []
                  const applicableRows = rows.filter(r => r.score !== null && r.max_score !== null)

                  return (
                    <div key={crit.id} className="border-b last:border-b-0 px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            <span className="text-muted-foreground mr-1.5">{crit.id}.</span>
                            {crit.label}
                          </p>
                          {/* Per-call flag row for multi-call audits */}
                          {call_count > 1 && rows.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {rows.map((r, i) => (
                                <FlagBadge key={i} score={r.score} maxScore={r.max_score} />
                              ))}
                            </div>
                          )}
                          {/* Evidence snippet for single-call audits */}
                          {call_count === 1 && applicableRows[0]?.transcript_evidence && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {applicableRows[0].transcript_evidence}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {crit.applicable_calls > 0 ? (
                            call_count === 1 ? (
                              <FlagBadge score={applicableRows[0]?.score ?? null} maxScore={applicableRows[0]?.max_score ?? null} />
                            ) : (
                              <span className={`text-sm font-semibold tabular-nums ${scoreColor(crit.avg_pct)}`}>
                                {crit.avg_pct.toFixed(0)}%
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                          {call_count > 1 && crit.applicable_calls > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {crit.applicable_calls}/{call_count} calls
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
