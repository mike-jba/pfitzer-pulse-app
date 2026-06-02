-- ============================================================
-- Migration 002: Call detail tables
-- call_transcripts, call_analysis, call_tags,
-- daily_recaps, processing_events
-- ============================================================

-- ── call_transcripts ─────────────────────────────────────────
-- Diarized transcript from Deepgram. One per call.

CREATE TABLE call_transcripts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id          UUID NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL DEFAULT 'deepgram',  -- 'deepgram' | 'whisper'
  transcript_text  TEXT,                              -- Plain joined text for search
  transcript_json  JSONB,                             -- Full provider response (diarized)
  duration_seconds NUMERIC(8,2),                      -- Provider-reported duration
  speaker_count    INT,
  language         TEXT DEFAULT 'en',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── call_analysis ─────────────────────────────────────────────
-- Structured AI analysis output from Claude. One per call.
-- Primary category must be from the controlled list in CLAUDE.md.

CREATE TABLE call_analysis (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id                  UUID NOT NULL UNIQUE REFERENCES calls(id) ON DELETE CASCADE,
  model                    TEXT,                      -- e.g. 'claude-sonnet-4-6'

  -- Summaries
  short_summary            TEXT,
  detailed_summary         TEXT,

  -- Classification
  primary_category         TEXT,                      -- From controlled list only
  secondary_categories     TEXT[],
  tags                     TEXT[],
  pest_types               TEXT[],

  -- Signals
  sentiment                call_sentiment DEFAULT 'unknown',
  follow_up_required       BOOLEAN DEFAULT false,
  complaint_flag           BOOLEAN DEFAULT false,
  sales_opportunity_flag   BOOLEAN DEFAULT false,

  -- Speaker identification
  customer_name_inferred   TEXT,
  agent_name_inferred      TEXT,

  -- AI confidence and transparency
  confidence_score         NUMERIC(4,2),              -- 0.00 to 1.00
  reasoning_notes          TEXT,

  -- Cost tracking
  input_tokens             INT,
  output_tokens            INT,
  cost_usd                 NUMERIC(10,6),

  -- Full raw response stored for debugging and reprocessing
  raw_response             JSONB,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER call_analysis_updated_at
  BEFORE UPDATE ON call_analysis
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── call_tags ─────────────────────────────────────────────────
-- Flexible tags on calls. Sourced from AI or added manually.

CREATE TABLE call_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id    UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'ai',              -- 'ai' | 'manual'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (call_id, tag)
);

-- ── daily_recaps ──────────────────────────────────────────────
-- Generated daily summaries. n8n triggers generation; Next.js displays them.

CREATE TABLE daily_recaps (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recap_date                 DATE NOT NULL UNIQUE,
  total_calls                INT DEFAULT 0,
  inbound_count              INT DEFAULT 0,
  outbound_count             INT DEFAULT 0,
  avg_duration_seconds       NUMERIC(8,2),
  complaints_count           INT DEFAULT 0,
  follow_up_count            INT DEFAULT 0,
  sales_opportunities_count  INT DEFAULT 0,
  calls_by_category          JSONB,                   -- { "Scheduling": 12, ... }
  calls_by_agent             JSONB,                   -- { "Ashley": 18, ... }
  top_tags                   JSONB,                   -- [{ tag, count }, ...]
  summary_text               TEXT,                    -- Plain-text narrative
  html_body                  TEXT,                    -- HTML email body
  plain_text_body            TEXT,
  generated_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── processing_events ─────────────────────────────────────────
-- Immutable event log for the n8n pipeline. Never updated, only inserted.

CREATE TABLE processing_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id          UUID REFERENCES calls(id) ON DELETE CASCADE,
  import_batch_id  UUID REFERENCES import_batches(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL,                     -- 'status_change' | 'error' | 'retry' | 'info'
  from_status      processing_status,
  to_status        processing_status,
  message          TEXT,
  metadata         JSONB,                             -- Any extra context (e.g. API response snippet)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
