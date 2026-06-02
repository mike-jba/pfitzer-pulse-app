import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  AlertTriangle,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CallVolumeChart } from "@/components/dashboard/call-volume-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { mockKpis, mockRecentCalls } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const sentimentColors: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-gray-100 text-gray-600",
  negative: "bg-red-100 text-red-700",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          title="Calls Yesterday"
          value={mockKpis.callsYesterday}
          icon={Phone}
          trendLabel="vs 38 day prior"
        />
        <KpiCard
          title="Calls This Week"
          value={mockKpis.callsThisWeek}
          icon={Phone}
          trendLabel="Mon–Sun"
        />
        <KpiCard
          title="Calls This Month"
          value={mockKpis.callsThisMonth}
          icon={Phone}
          trendLabel="June 2026"
        />
        <KpiCard
          title="Avg Duration"
          value={fmt(mockKpis.avgDurationSeconds)}
          icon={Clock}
          trendLabel="per call"
        />
        <KpiCard
          title="Inbound"
          value={mockKpis.inboundCount}
          icon={PhoneIncoming}
          accent="success"
          trendLabel="this month"
        />
        <KpiCard
          title="Outbound"
          value={mockKpis.outboundCount}
          icon={PhoneOutgoing}
          trendLabel="this month"
        />
        <KpiCard
          title="Complaints"
          value={mockKpis.complaintsCount}
          icon={AlertTriangle}
          accent="danger"
          trendLabel="this month"
        />
      </div>

      {/* Second KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Follow-ups Required"
          value={mockKpis.followUpRequired}
          icon={UserCheck}
          accent="warning"
          trendLabel="need action"
        />
        <KpiCard
          title="Sales Opportunities"
          value={mockKpis.salesOpportunities}
          icon={TrendingUp}
          accent="success"
          trendLabel="new leads this month"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CallVolumeChart />
        <CategoryChart />
      </div>

      {/* Recent Calls Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Recent Calls</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Caller</th>
                <th className="px-4 py-3 text-left font-medium">Agent</th>
                <th className="px-4 py-3 text-left font-medium">Duration</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Sentiment</th>
                <th className="px-4 py-3 text-left font-medium">Flags</th>
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
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {fmtTime(call.callTime)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{call.fromName}</div>
                    <div className="text-xs text-muted-foreground">
                      {call.fromNumber}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
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
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        sentimentColors[call.sentiment]
                      }`}
                    >
                      {call.sentiment}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {call.complaintFlag && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                          Complaint
                        </span>
                      )}
                      {call.followUpRequired && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                          Follow-up
                        </span>
                      )}
                      {call.salesOpportunity && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                          Lead
                        </span>
                      )}
                    </div>
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
