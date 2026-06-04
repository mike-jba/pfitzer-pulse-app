import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCallDetail,
  parseTranscript,
} from "@/lib/data/call-detail";
import { getActiveAgents } from "@/lib/data/audits";
import { AuditCallButton } from "@/components/audits/audit-call-button";
import { CallDetailContent, sentimentColors } from "@/components/calls/call-detail-content";

// ── Page-only formatters ─────────────────────────────────────────

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
}

function fmtEventTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
}

const statusColors: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-700",
  metadata_saved: "bg-gray-100 text-gray-500",
  failed: "bg-red-100 text-red-700",
  analyzing: "bg-blue-100 text-blue-700",
  transcribing: "bg-amber-100 text-amber-700",
  transcribed: "bg-blue-100 text-blue-600",
};

function FlagChip({
  active,
  color,
  label,
}: {
  active: boolean | null | undefined;
  color: string;
  label: string;
}) {
  if (!active) return null;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ── Page ────────────────────────────────────────────────────────

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [call, agents] = await Promise.all([getCallDetail(id), getActiveAgents()]);
  if (!call) notFound();

  const transcriptLines = parseTranscript(call.transcript?.transcript_text ?? null);
  const { analysis } = call;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/calls"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Call Explorer
      </Link>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            {call.from_name ?? call.from_number ?? "Unknown Caller"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {fmtDateTime(call.call_time_ct)}
            {call.from_number && call.from_name
              ? ` · ${call.from_number}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Processing status */}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              statusColors[call.processing_status ?? ""] ??
              "bg-gray-100 text-gray-600"
            }`}
          >
            {(call.processing_status ?? "unknown").replace(/_/g, " ")}
          </span>
          {/* Sentiment */}
          {analysis?.sentiment && analysis.sentiment !== "unknown" && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                sentimentColors[analysis.sentiment] ?? sentimentColors.unknown
              }`}
            >
              {analysis.sentiment}
            </span>
          )}
          {/* Flags */}
          <FlagChip
            active={analysis?.complaint_flag}
            color="bg-red-100 text-red-700"
            label="Complaint"
          />
          <FlagChip
            active={analysis?.follow_up_required}
            color="bg-amber-100 text-amber-700"
            label="Follow-up"
          />
          <FlagChip
            active={analysis?.sales_opportunity_flag}
            color="bg-emerald-100 text-emerald-700"
            label="Sales Opp"
          />
          <FlagChip
            active={analysis?.booking_made}
            color="bg-blue-100 text-blue-700"
            label="Booking Made"
          />
          <AuditCallButton callId={call.id} agentId={call.agent_id} agents={agents} />
        </div>
      </div>

      {/* Shared detail content: Call Details + AI Analysis + Transcript */}
      <CallDetailContent call={call} transcriptLines={transcriptLines} />

      {/* Processing Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Processing Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {call.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events logged.</p>
          ) : (
            <ol className="space-y-2">
              {call.events.map((ev) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <span className="mt-0.5 shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtEventTime(ev.created_at)}
                  </span>
                  <span className="shrink-0">
                    {ev.to_status ? (
                      <span className="font-medium">→ {ev.to_status.replace(/_/g, " ")}</span>
                    ) : (
                      <span className="text-muted-foreground capitalize">
                        {ev.event_type}
                      </span>
                    )}
                  </span>
                  {ev.message && (
                    <span className="text-muted-foreground">{ev.message}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
