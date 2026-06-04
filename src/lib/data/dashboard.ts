import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { MIN_CALL_DURATION_SECONDS } from "./constants";

// Returns a date string "YYYY-MM-DD" in America/Chicago timezone, offset by N days.
function ctDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function ctMonthStart(): string {
  const today = ctDate();
  return today.slice(0, 8) + "01"; // "2026-06-03" → "2026-06-01"
}

export type DashboardKpis = {
  callsYesterday: number;
  callsThisWeek: number;
  callsThisMonth: number;
  avgDurationSeconds: number;
  inboundCount: number;
  outboundCount: number;
  complaintsCount: number;
  followUpRequired: number;
  salesOpportunities: number;
};

export type CallVolumeRow = { date: string; calls: number };
export type CategoryRow = { category: string; count: number };

export type RecentCall = {
  id: string;
  call_time_ct: string | null;
  from_name: string | null;
  from_number: string | null;
  agent_name_inferred: string | null;
  duration_seconds: number | null;
  primary_category: string | null;
  sentiment: string | null;
  follow_up_required: boolean | null;
  complaint_flag: boolean | null;
  sales_opportunity_flag: boolean | null;
  direction: string | null;
  processing_status: string | null;
};

export type DashboardData = {
  kpis: DashboardKpis;
  callVolume: CallVolumeRow[];
  categories: CategoryRow[];
  recentCalls: RecentCall[];
};

export async function getDashboardData(): Promise<DashboardData> {
  noStore();
  const supabase = createServiceClient();

  const yesterday = ctDate(-1);
  const weekStart = ctDate(-6); // last 7 days including today
  const monthStart = ctMonthStart();
  const volumeStart = ctDate(-6);

  const [
    yesterdayResult,
    weekResult,
    monthResult,
    volumeResult,
    recentResult,
  ] = await Promise.all([
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("call_date", yesterday)
      .gt("duration_seconds", MIN_CALL_DURATION_SECONDS),

    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .gte("call_date", weekStart)
      .gt("duration_seconds", MIN_CALL_DURATION_SECONDS),

    supabase
      .from("calls")
      .select(
        "direction, duration_seconds, primary_category, follow_up_required, complaint_flag, sales_opportunity_flag"
      )
      .gte("call_date", monthStart)
      .gt("duration_seconds", MIN_CALL_DURATION_SECONDS),

    supabase
      .from("calls")
      .select("call_date")
      .gte("call_date", volumeStart)
      .gt("duration_seconds", MIN_CALL_DURATION_SECONDS)
      .order("call_date", { ascending: true }),

    supabase
      .from("calls")
      .select(
        "id, call_time_ct, from_name, from_number, agent_name_inferred, duration_seconds, primary_category, sentiment, follow_up_required, complaint_flag, sales_opportunity_flag, direction, processing_status"
      )
      .gt("duration_seconds", MIN_CALL_DURATION_SECONDS)
      .order("call_time_ct", { ascending: false })
      .limit(20),
  ]);

  // --- KPIs from month data ---
  type MonthRow = {
    direction: string | null;
    duration_seconds: number | null;
    primary_category: string | null;
    follow_up_required: boolean | null;
    complaint_flag: boolean | null;
    sales_opportunity_flag: boolean | null;
  };
  const monthCalls = (monthResult.data ?? []) as MonthRow[];
  const callsThisMonth = monthCalls.length;
  const inboundCount = monthCalls.filter((c) => c.direction === "inbound").length;
  const outboundCount = monthCalls.filter((c) => c.direction === "outbound").length;
  const complaintsCount = monthCalls.filter((c) => c.complaint_flag).length;
  const followUpRequired = monthCalls.filter((c) => c.follow_up_required).length;
  const salesOpportunities = monthCalls.filter((c) => c.sales_opportunity_flag).length;

  const withDuration = monthCalls.filter((c) => c.duration_seconds != null);
  const avgDurationSeconds =
    withDuration.length > 0
      ? Math.round(
          withDuration.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) /
            withDuration.length
        )
      : 0;

  // --- Category breakdown ---
  const catMap = new Map<string, number>();
  for (const c of monthCalls) {
    if (c.primary_category) {
      catMap.set(c.primary_category, (catMap.get(c.primary_category) ?? 0) + 1);
    }
  }
  const categories: CategoryRow[] = Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // --- Call volume last 7 days ---
  const dateCountMap = new Map<string, number>();
  for (const row of volumeResult.data ?? []) {
    const d = (row as { call_date: string }).call_date;
    if (d) dateCountMap.set(d, (dateCountMap.get(d) ?? 0) + 1);
  }

  const callVolume: CallVolumeRow[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = ctDate(-i);
    // Format "2026-06-03" → "Jun 3" without timezone skew
    const [, month, day] = d.split("-");
    const label = new Date(
      parseInt(d.split("-")[0]),
      parseInt(month) - 1,
      parseInt(day)
    ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    callVolume.push({ date: label, calls: dateCountMap.get(d) ?? 0 });
  }

  return {
    kpis: {
      callsYesterday: yesterdayResult.count ?? 0,
      callsThisWeek: weekResult.count ?? 0,
      callsThisMonth,
      avgDurationSeconds,
      inboundCount,
      outboundCount,
      complaintsCount,
      followUpRequired,
      salesOpportunities,
    },
    callVolume,
    categories,
    recentCalls: (recentResult.data ?? []) as RecentCall[],
  };
}
