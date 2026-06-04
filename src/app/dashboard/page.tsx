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
import { RecentCallsTable } from "@/components/dashboard/recent-calls-table";
import { getDashboardData } from "@/lib/data/dashboard";

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

      {/* Recent Calls — clickable rows with slide-out detail panel */}
      <RecentCallsTable calls={recentCalls} />
    </div>
  );
}
