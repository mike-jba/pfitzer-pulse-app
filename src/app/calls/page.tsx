import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { mockRecentCalls } from "@/lib/mock-data";
import { ArrowUpRight } from "lucide-react";

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const statusColors: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-700",
  analyzing: "bg-blue-100 text-blue-700",
  transcribing: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

export default function CallsPage() {
  return (
    <div className="space-y-4">
      {/* Filters placeholder */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
        <span className="text-sm text-muted-foreground">
          Filters coming in Chunk 9 — showing mock data
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">
            All Calls{" "}
            <span className="ml-1 text-muted-foreground font-normal">
              ({mockRecentCalls.length} shown)
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Date / Time</th>
                <th className="px-4 py-3 text-left font-medium">Dir</th>
                <th className="px-4 py-3 text-left font-medium">Caller</th>
                <th className="px-4 py-3 text-left font-medium">Agent</th>
                <th className="px-4 py-3 text-left font-medium">Duration</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Summary</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {mockRecentCalls.map((call, i) => (
                <tr
                  key={call.id}
                  className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${
                    i % 2 === 1 ? "bg-muted/10" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground text-xs">
                    {fmtDateTime(call.callTime)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide ${
                        call.direction === "inbound"
                          ? "text-blue-500"
                          : "text-orange-500"
                      }`}
                    >
                      {call.direction === "inbound" ? "In" : "Out"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{call.fromName}</div>
                    <div className="text-xs text-muted-foreground">
                      {call.fromNumber}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {call.agent}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {fmt(call.durationSeconds)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">
                      {call.primaryCategory}
                    </Badge>
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate text-xs text-muted-foreground">
                      {call.shortSummary}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        statusColors[call.processingStatus] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {call.processingStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/calls/${call.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
