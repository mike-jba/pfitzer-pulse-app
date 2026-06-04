"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CallDetailContent } from "@/components/calls/call-detail-content";
import { getCallDetailAction } from "@/lib/actions/call-detail";
import type { RecentCall } from "@/lib/data/dashboard";
import type { CallDetailData, TranscriptLine } from "@/lib/data/call-detail";

// Inline parseTranscript — the source lives in a server-only module
// so we duplicate the pure string parser here to avoid the server-only
// import error in this client component.
function parseTranscript(text: string | null): TranscriptLine[] {
  if (!text) return [];
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[([^\]]+)\]:\s*(.+)$/);
      if (match) return { speaker: match[1], text: match[2] };
      return { speaker: "Unknown", text: line };
    });
}

// ── Formatters ──────────────────────────────────────────────────

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
}

const sentimentColors: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-gray-100 text-gray-600",
  negative: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-400",
};

// ── Pending badge ────────────────────────────────────────────────

function PendingBadge() {
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      Pending
    </span>
  );
}

// ── Component ───────────────────────────────────────────────────

export function RecentCallsTable({ calls }: { calls: RecentCall[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CallDetailData | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRowClick(id: string) {
    setSelectedId(id);
    setLoading(true);
    setDetail(null);
    const d = await getCallDetailAction(id);
    setDetail(d);
    setLoading(false);
  }

  function handleSheetOpenChange(open: boolean) {
    if (!open) {
      setSelectedId(null);
      setDetail(null);
    }
  }

  const transcriptLines = detail
    ? parseTranscript(detail.transcript?.transcript_text ?? null)
    : [];

  return (
    <>
      {/* Table card */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Recent Calls</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="px-3 py-1.5 text-left font-medium">
                  Date / Time (CT)
                </th>
                <th className="px-3 py-1.5 text-left font-medium">Caller</th>
                <th className="px-3 py-1.5 text-left font-medium">Agent</th>
                <th className="px-3 py-1.5 text-left font-medium">Duration</th>
                <th className="px-3 py-1.5 text-left font-medium">Category</th>
                <th className="px-3 py-1.5 text-left font-medium">Sentiment</th>
                <th className="px-3 py-1.5 text-left font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No calls yet.
                  </td>
                </tr>
              ) : (
                calls.map((call, i) => {
                  const isPending = call.processing_status !== "complete";
                  return (
                  <tr
                    key={call.id}
                    onClick={() => handleRowClick(call.id)}
                    className={`cursor-pointer border-b last:border-0 hover:bg-muted/20 transition-colors ${
                      i % 2 === 1 ? "bg-muted/10" : ""
                    } ${selectedId === call.id ? "bg-muted/25" : ""}`}
                  >
                    <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                      {fmtTime(call.call_time_ct)}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="font-medium leading-tight">
                        {call.from_name ?? "Unknown"}
                      </div>
                      <div className="text-[11px] leading-tight text-muted-foreground">
                        {call.from_number ?? "—"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5">
                      {isPending ? <PendingBadge /> : (call.agent_name_inferred ?? "—")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                      {call.duration_seconds != null
                        ? fmt(call.duration_seconds)
                        : "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      {isPending ? (
                        <PendingBadge />
                      ) : call.primary_category ? (
                        <Badge variant="secondary" className="text-xs">
                          {call.primary_category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {call.sentiment ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            sentimentColors[call.sentiment] ??
                            sentimentColors.unknown
                          }`}
                        >
                          {call.sentiment}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex gap-1 flex-wrap">
                        {call.complaint_flag && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                            Complaint
                          </span>
                        )}
                        {call.follow_up_required && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                            Follow-up
                          </span>
                        )}
                        {call.sales_opportunity_flag && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                            Lead
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out detail panel */}
      <Sheet open={selectedId !== null} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {loading
                ? "Loading call…"
                : detail
                  ? (detail.from_name ?? detail.from_number ?? "Call Detail")
                  : "Call Detail"}
            </SheetTitle>
          </SheetHeader>
          <div className="p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : detail ? (
              <CallDetailContent
                call={detail}
                transcriptLines={transcriptLines}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No detail available.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
