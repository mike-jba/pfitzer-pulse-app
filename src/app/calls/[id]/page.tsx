import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  User,
  Clock,
  Calendar,
  Hash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCallDetail,
  parseTranscript,
} from "@/lib/data/call-detail";
import { getActiveAgents } from "@/lib/data/audits";
import { AuditCallButton } from "@/components/audits/audit-call-button";

// ── Formatters ──────────────────────────────────────────────────

function fmt(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

function fmtOutcome(outcome: string | null): string {
  if (!outcome) return "—";
  return outcome.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Style maps ──────────────────────────────────────────────────

const sentimentColors: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-gray-100 text-gray-600",
  negative: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-400",
};

const statusColors: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-700",
  metadata_saved: "bg-gray-100 text-gray-500",
  failed: "bg-red-100 text-red-700",
  analyzing: "bg-blue-100 text-blue-700",
  transcribing: "bg-amber-100 text-amber-700",
  transcribed: "bg-blue-100 text-blue-600",
};

// Assign a stable color per speaker index
const speakerColors = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
];

function speakerColor(speaker: string): string {
  const match = speaker.match(/(\d+)$/);
  const idx = match ? parseInt(match[1]) % speakerColors.length : 0;
  return speakerColors[idx];
}

// ── Sub-components ──────────────────────────────────────────────

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

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

      {/* Main grid — details + analysis */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Call Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Call Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <MetaRow
              icon={Phone}
              label="From"
              value={
                <span>
                  {call.from_name ?? "Unknown"}
                  {call.from_number && (
                    <span className="ml-1.5 text-muted-foreground font-normal">
                      {call.from_number}
                    </span>
                  )}
                </span>
              }
            />
            {call.dialed_number && (
              <MetaRow
                icon={Phone}
                label="Dialed"
                value={call.dialed_number}
              />
            )}
            <MetaRow
              icon={User}
              label="Agent"
              value={
                call.agent_name_inferred ??
                analysis?.agent_name_inferred ??
                "—"
              }
            />
            <MetaRow icon={Clock} label="Duration" value={fmt(call.duration_seconds)} />
            <MetaRow
              icon={Calendar}
              label="Direction"
              value={
                call.direction
                  ? call.direction.charAt(0).toUpperCase() +
                    call.direction.slice(1)
                  : "Unknown"
              }
            />
            {call.to_extension && (
              <MetaRow
                icon={Hash}
                label="Extension"
                value={call.to_extension}
              />
            )}
            {call.call_id_portal && (
              <MetaRow
                icon={Hash}
                label="Portal ID"
                value={
                  <span className="font-mono text-xs">
                    {call.call_id_portal}
                  </span>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* AI Analysis */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!analysis ? (
              <p className="text-sm text-muted-foreground">
                No analysis available — call was not processed by the AI pipeline.
              </p>
            ) : (
              <>
                {/* Summary */}
                {analysis.short_summary && (
                  <div>
                    <SectionLabel>Summary</SectionLabel>
                    <p className="mt-1 text-sm leading-relaxed">
                      {analysis.short_summary}
                    </p>
                  </div>
                )}

                {/* Detailed summary */}
                {analysis.detailed_summary && (
                  <div>
                    <SectionLabel>Detailed Summary</SectionLabel>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {analysis.detailed_summary}
                    </p>
                  </div>
                )}

                {/* Classification row */}
                <div className="flex flex-wrap gap-3">
                  {analysis.primary_category && (
                    <div className="rounded-lg border bg-muted/30 px-3 py-1.5">
                      <SectionLabel>Category</SectionLabel>
                      <p className="mt-0.5 text-xs font-semibold">
                        {analysis.primary_category}
                      </p>
                    </div>
                  )}
                  {analysis.call_outcome && (
                    <div className="rounded-lg border bg-muted/30 px-3 py-1.5">
                      <SectionLabel>Outcome</SectionLabel>
                      <p className="mt-0.5 text-xs font-semibold">
                        {fmtOutcome(analysis.call_outcome)}
                      </p>
                    </div>
                  )}
                  {analysis.customer_name_inferred && (
                    <div className="rounded-lg border bg-muted/30 px-3 py-1.5">
                      <SectionLabel>Customer</SectionLabel>
                      <p className="mt-0.5 text-xs font-semibold">
                        {analysis.customer_name_inferred}
                      </p>
                    </div>
                  )}
                  {analysis.confidence_score != null && (
                    <div className="rounded-lg border bg-muted/30 px-3 py-1.5">
                      <SectionLabel>Confidence</SectionLabel>
                      <p className="mt-0.5 text-xs font-semibold">
                        {Math.round(analysis.confidence_score * 100)}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {(analysis.tags?.length ?? 0) > 0 && (
                  <div>
                    <SectionLabel>Tags</SectionLabel>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {analysis.tags!.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pest types */}
                {(analysis.pest_types?.length ?? 0) > 0 && (
                  <div>
                    <SectionLabel>Pest Types</SectionLabel>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {analysis.pest_types!.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics discussed */}
                {(analysis.topics_discussed?.length ?? 0) > 0 && (
                  <div>
                    <SectionLabel>Topics Discussed</SectionLabel>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {analysis.topics_discussed!.map((topic) => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Secondary categories */}
                {(analysis.secondary_categories?.length ?? 0) > 0 && (
                  <div>
                    <SectionLabel>Also Covers</SectionLabel>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {analysis.secondary_categories!.map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cost footnote */}
                {analysis.cost_usd != null && (
                  <p className="text-[11px] text-muted-foreground">
                    Analysis cost: ${analysis.cost_usd.toFixed(4)} ·{" "}
                    {analysis.input_tokens?.toLocaleString()} in /{" "}
                    {analysis.output_tokens?.toLocaleString()} out tokens
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transcript */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Transcript</CardTitle>
            {call.transcript?.speaker_count != null && (
              <span className="text-xs text-muted-foreground">
                {call.transcript.speaker_count} speaker
                {call.transcript.speaker_count !== 1 ? "s" : ""} detected
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {transcriptLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {call.transcript
                ? "Transcript is empty."
                : "No transcript available — call was not transcribed."}
            </p>
          ) : (
            <div className="space-y-3">
              {transcriptLines.map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${speakerColor(
                      line.speaker
                    )}`}
                  >
                    {line.speaker}
                  </span>
                  <p className="text-sm leading-relaxed">{line.text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
