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
import { getDashboardData } from "@/lib/data/dashboard";
import { Badge } from "@/components/ui/badge";

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

export default async function DashboardPage() {
  const { kpis, callVolume, categories, recentCalls } = await getDashboardData();

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          title="Calls Yesterday"
          value={kpis.callsYesterday}
          icon={Phone}
          trendLabel="vs prior day"
        />
        <KpiCard
          title="Calls This Week"
          value={kpis.callsThisWeek}
          icon={Phone}
          trendLabel="last 7 days"
        />
        <KpiCard
          title="Calls This Month"
          value={kpis.callsThisMonth}
          icon={Phone}
          trendLabel={new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "America/Chicago",
          })}
        />
        <KpiCard
          title="Avg Duration"
          value={fmt(kpis.avgDurationSeconds)}
          icon={Clock}
          trendLabel="per call"
        />
        <KpiCard
          title="Inbound"
          value={kpis.inboundCount}
          icon={PhoneIncoming}
          accent="success"
          trendLabel="this month"
        />
        <KpiCard
          title="Outbound"
          value={kpis.outboundCount}
          icon={PhoneOutgoing}
          trendLabel="this month"
        />
        <KpiCard
          title="Complaints"
          value={kpis.complaintsCount}
          icon={AlertTriangle}
          accent="danger"
          trendLabel="this month"
        />
      </div>

      {/* Second KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Follow-ups Required"
          value={kpis.followUpRequired}
          icon={UserCheck}
          accent="warning"
          trendLabel="need action"
        />
        <KpiCard
          title="Sales Opportunities"
          value={kpis.salesOpportunities}
          icon={TrendingUp}
          accent="success"
          trendLabel="new leads this month"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CallVolumeChart data={callVolume} />
        <CategoryChart data={categories} />
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
                <th className="px-4 py-2 text-left font-medium">Date / Time (CT)</th>
                <th className="px-4 py-2 text-left font-medium">Caller</th>
                <th className="px-4 py-2 text-left font-medium">Agent</th>
                <th className="px-4 py-2 text-left font-medium">Duration</th>
                <th className="px-4 py-2 text-left font-medium">Category</th>
                <th className="px-4 py-2 text-left font-medium">Sentiment</th>
                <th className="px-4 py-2 text-left font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No calls yet.
                  </td>
                </tr>
              ) : (
                recentCalls.map((call, i) => (
                  <tr
                    key={call.id}
                    className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${
                      i % 2 === 1 ? "bg-muted/10" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                      {fmtTime(call.call_time_ct)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">
                        {call.from_name ?? "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {call.from_number ?? "—"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {call.agent_name_inferred ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                      {call.duration_seconds != null
                        ? fmt(call.duration_seconds)
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {call.primary_category ? (
                        <Badge variant="secondary" className="text-xs">
                          {call.primary_category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
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
                    <td className="px-4 py-2">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
