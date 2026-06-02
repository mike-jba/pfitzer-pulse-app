import Link from "next/link";
import { ArrowLeft, Clock, Phone, User, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockRecentCalls } from "@/lib/mock-data";

const mockTranscript = [
  { speaker: "Agent", text: "Thank you for calling Pfitzer Pest Control, this is Ashley, how can I help you today?" },
  { speaker: "Customer", text: "Hi, I was calling about my invoice. I got a charge and I'm not sure what it's for." },
  { speaker: "Agent", text: "Of course, I can look into that for you. Can I get your name and address?" },
  { speaker: "Customer", text: "Sure, it's Steve Johnson, 1842 Oak Street." },
  { speaker: "Agent", text: "Thanks Steve. I'm pulling up your account now. It looks like the charge is for your quarterly exterior treatment that was completed on May 15th." },
  { speaker: "Customer", text: "Oh okay, I didn't realize that had already happened. When is my next one?" },
  { speaker: "Agent", text: "Your next scheduled service is August 14th. You'll get a reminder call the day before." },
  { speaker: "Customer", text: "Perfect, that makes sense. Thanks for clearing that up." },
  { speaker: "Agent", text: "Absolutely, is there anything else I can help you with today?" },
  { speaker: "Customer", text: "No that's it, thank you!" },
  { speaker: "Agent", text: "Have a great day Steve, take care!" },
];

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const call = mockRecentCalls.find((c) => c.id === id) ?? mockRecentCalls[0];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/calls"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Call Explorer
      </Link>

      {/* Metadata + Summary row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Call Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Call Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row icon={Phone} label="From" value={`${call.fromName} · ${call.fromNumber}`} />
            <Row icon={User} label="Agent" value={call.agent} />
            <Row icon={Clock} label="Duration" value={fmt(call.durationSeconds)} />
            <Row
              icon={Tag}
              label="Direction"
              value={call.direction.charAt(0).toUpperCase() + call.direction.slice(1)}
            />
            <div className="pt-2">
              <div className="flex flex-wrap gap-1">
                {call.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Summary
              </p>
              <p className="mt-1">{call.shortSummary}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Chip label="Category" value={call.primaryCategory} />
              <Chip label="Sentiment" value={call.sentiment} />
              <Chip label="Follow-up" value={call.followUpRequired ? "Yes" : "No"} />
              <Chip label="Complaint" value={call.complaintFlag ? "Yes" : "No"} />
              <Chip label="Sales Opp." value={call.salesOpportunity ? "Yes" : "No"} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTranscript.map((line, i) => (
              <div key={i} className="flex gap-3">
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    line.speaker === "Agent"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {line.speaker}
                </span>
                <p className="text-sm leading-relaxed">{line.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processing Events placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Processing Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Processing event log will appear here once the pipeline is connected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xs font-semibold">{value}</p>
    </div>
  );
}
