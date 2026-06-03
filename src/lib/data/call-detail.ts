import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export type AnalysisData = {
  short_summary: string | null;
  detailed_summary: string | null;
  primary_category: string | null;
  secondary_categories: string[] | null;
  tags: string[] | null;
  pest_types: string[] | null;
  topics_discussed: string[] | null;
  sentiment: string | null;
  follow_up_required: boolean | null;
  complaint_flag: boolean | null;
  sales_opportunity_flag: boolean | null;
  booking_made: boolean | null;
  call_outcome: string | null;
  customer_name_inferred: string | null;
  agent_name_inferred: string | null;
  confidence_score: number | null;
  cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
};

export type TranscriptData = {
  transcript_text: string | null;
  speaker_count: number | null;
  duration_seconds: number | null;
};

export type ProcessingEvent = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  created_at: string;
};

export type CallDetailData = {
  id: string;
  call_time_ct: string | null;
  call_date: string | null;
  direction: string | null;
  from_name: string | null;
  from_number: string | null;
  dialed_number: string | null;
  to_extension: string | null;
  orig_id: string | null;
  call_id_portal: string | null;
  agent_id: string | null;
  agent_name_inferred: string | null;
  duration_seconds: number | null;
  processing_status: string | null;
  analysis: AnalysisData | null;
  transcript: TranscriptData | null;
  events: ProcessingEvent[];
};

export type TranscriptLine = { speaker: string; text: string };

export function parseTranscript(text: string | null): TranscriptLine[] {
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

export async function getCallDetail(
  id: string
): Promise<CallDetailData | null> {
  noStore();
  const supabase = createServiceClient();

  const [callResult, eventsResult] = await Promise.all([
    supabase
      .from("calls")
      .select(
        `id, call_time_ct, call_date, direction, from_name, from_number,
         dialed_number, to_extension, orig_id, call_id_portal,
         agent_id, agent_name_inferred, duration_seconds, processing_status,
         call_analysis (
           short_summary, detailed_summary, primary_category,
           secondary_categories, tags, pest_types, topics_discussed,
           sentiment, follow_up_required, complaint_flag,
           sales_opportunity_flag, booking_made, call_outcome,
           customer_name_inferred, agent_name_inferred,
           confidence_score, cost_usd, input_tokens, output_tokens
         ),
         call_transcripts (
           transcript_text, speaker_count, duration_seconds
         )`
      )
      .eq("id", id)
      .single(),

    supabase
      .from("processing_events")
      .select("id, event_type, from_status, to_status, message, created_at")
      .eq("call_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const { data: callData, error: callError } = callResult;
  if (callError || !callData) return null;

  const r = callData as Record<string, unknown>;
  const analysisArr = r.call_analysis as Record<string, unknown>[] | null;
  const transcriptArr = r.call_transcripts as Record<string, unknown>[] | null;
  const a = analysisArr?.[0] ?? null;
  const t = transcriptArr?.[0] ?? null;

  return {
    id: r.id as string,
    call_time_ct: r.call_time_ct as string | null,
    call_date: r.call_date as string | null,
    direction: r.direction as string | null,
    from_name: r.from_name as string | null,
    from_number: r.from_number as string | null,
    dialed_number: r.dialed_number as string | null,
    to_extension: r.to_extension as string | null,
    orig_id: r.orig_id as string | null,
    call_id_portal: r.call_id_portal as string | null,
    agent_id: r.agent_id as string | null,
    agent_name_inferred: r.agent_name_inferred as string | null,
    duration_seconds: r.duration_seconds as number | null,
    processing_status: r.processing_status as string | null,
    analysis: a
      ? {
          short_summary: a.short_summary as string | null,
          detailed_summary: a.detailed_summary as string | null,
          primary_category: a.primary_category as string | null,
          secondary_categories: a.secondary_categories as string[] | null,
          tags: a.tags as string[] | null,
          pest_types: a.pest_types as string[] | null,
          topics_discussed: a.topics_discussed as string[] | null,
          sentiment: a.sentiment as string | null,
          follow_up_required: a.follow_up_required as boolean | null,
          complaint_flag: a.complaint_flag as boolean | null,
          sales_opportunity_flag: a.sales_opportunity_flag as boolean | null,
          booking_made: a.booking_made as boolean | null,
          call_outcome: a.call_outcome as string | null,
          customer_name_inferred: a.customer_name_inferred as string | null,
          agent_name_inferred: a.agent_name_inferred as string | null,
          confidence_score: a.confidence_score as number | null,
          cost_usd: a.cost_usd as number | null,
          input_tokens: a.input_tokens as number | null,
          output_tokens: a.output_tokens as number | null,
        }
      : null,
    transcript: t
      ? {
          transcript_text: t.transcript_text as string | null,
          speaker_count: t.speaker_count as number | null,
          duration_seconds: t.duration_seconds as number | null,
        }
      : null,
    events: (eventsResult.data ?? []).map((e) => ({
      id: e.id as string,
      event_type: e.event_type as string,
      from_status: e.from_status as string | null,
      to_status: e.to_status as string | null,
      message: e.message as string | null,
      created_at: e.created_at as string,
    })),
  };
}
