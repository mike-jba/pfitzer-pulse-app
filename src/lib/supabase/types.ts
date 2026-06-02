/**
 * Database type stubs for Pfitzer Pulse.
 * These are expanded with full table types in Chunk 3 once the schema is written.
 * Generated types from `supabase gen types typescript` will replace this file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      // Populated in Chunk 3
      calls: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      call_transcripts: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      call_analysis: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      agents: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      daily_recaps: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      processing_events: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      processing_status:
        | "discovered"
        | "metadata_saved"
        | "audio_downloaded"
        | "audio_converted"
        | "transcribing"
        | "transcribed"
        | "analyzing"
        | "analyzed"
        | "complete"
        | "failed"
        | "skipped_duplicate";
      call_direction: "inbound" | "outbound" | "unknown";
      call_sentiment: "positive" | "neutral" | "negative" | "unknown";
    };
  };
};
