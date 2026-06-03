import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export type CallListRow = {
  id: string;
  call_time_ct: string | null;
  call_date: string | null;
  direction: string | null;
  from_name: string | null;
  from_number: string | null;
  agent_name_inferred: string | null;
  duration_seconds: number | null;
  primary_category: string | null;
  sentiment: string | null;
  follow_up_required: boolean | null;
  complaint_flag: boolean | null;
  sales_opportunity_flag: boolean | null;
  processing_status: string | null;
  short_summary: string | null;
};

export async function getCalls(): Promise<CallListRow[]> {
  noStore();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("calls")
    .select(
      `id, call_time_ct, call_date, direction, from_name, from_number,
       agent_name_inferred, duration_seconds, primary_category, sentiment,
       follow_up_required, complaint_flag, sales_opportunity_flag,
       processing_status,
       call_analysis (short_summary)`
    )
    .order("call_time_ct", { ascending: false });

  if (error) {
    console.error("[getCalls]", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const analysis = r.call_analysis as { short_summary: string | null }[] | null;
    return {
      id: r.id as string,
      call_time_ct: r.call_time_ct as string | null,
      call_date: r.call_date as string | null,
      direction: r.direction as string | null,
      from_name: r.from_name as string | null,
      from_number: r.from_number as string | null,
      agent_name_inferred: r.agent_name_inferred as string | null,
      duration_seconds: r.duration_seconds as number | null,
      primary_category: r.primary_category as string | null,
      sentiment: r.sentiment as string | null,
      follow_up_required: r.follow_up_required as boolean | null,
      complaint_flag: r.complaint_flag as boolean | null,
      sales_opportunity_flag: r.sales_opportunity_flag as boolean | null,
      processing_status: r.processing_status as string | null,
      short_summary: analysis?.[0]?.short_summary ?? null,
    };
  });
}
