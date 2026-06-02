-- ============================================================
-- Migration 001: Core tables
-- agents, app_users, import_batches, calls
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE processing_status AS ENUM (
  'discovered',
  'metadata_saved',
  'audio_downloaded',
  'audio_converted',
  'transcribing',
  'transcribed',
  'analyzing',
  'analyzed',
  'complete',
  'failed',
  'skipped_duplicate'
);

CREATE TYPE call_direction AS ENUM (
  'inbound',
  'outbound',
  'unknown'
);

CREATE TYPE call_sentiment AS ENUM (
  'positive',
  'neutral',
  'negative',
  'unknown'
);

-- ── updated_at trigger helper ─────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── agents ───────────────────────────────────────────────────
-- Office staff who handle calls. Separate from auth users.

CREATE TABLE agents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,                -- Full name: "Ashley Terhark"
  display_name     TEXT NOT NULL,                -- Short name: "Ashley"
  extensions       TEXT[],                       -- Known VoIP extension numbers
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── app_users ─────────────────────────────────────────────────
-- Dashboard users (Mike, Karen, Garret). Linked to Supabase Auth.

CREATE TABLE app_users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  full_name        TEXT,
  role             TEXT NOT NULL DEFAULT 'viewer', -- 'admin' | 'viewer'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── import_batches ────────────────────────────────────────────
-- Tracks each n8n ingestion run.

CREATE TABLE import_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date            DATE NOT NULL,
  source              TEXT NOT NULL DEFAULT 'atscall_portal',
  status              TEXT NOT NULL DEFAULT 'running', -- running | complete | failed
  calls_discovered    INT DEFAULT 0,
  calls_processed     INT DEFAULT 0,
  calls_failed        INT DEFAULT 0,
  calls_skipped       INT DEFAULT 0,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  error_message       TEXT,
  n8n_execution_id    TEXT,                          -- n8n execution ID for tracing
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── calls ─────────────────────────────────────────────────────
-- Central table. Every call record lives here.

CREATE TABLE calls (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id           UUID REFERENCES import_batches(id) ON DELETE SET NULL,

  -- Voice for Pest identifiers
  original_filename         TEXT,                   -- Full WAV filename as downloaded
  call_id_portal            TEXT UNIQUE,            -- term_id from portal (deduplication key)
  orig_id                   TEXT,                   -- Origination ID from portal
  case_id                   TEXT,                   -- Portal case_id

  -- Timestamps
  -- Portal term_id prefix is Central time; WAV filename prefix is UTC.
  -- Both stored; all display uses call_time_ct.
  filename_timestamp_utc    TIMESTAMPTZ,            -- Parsed from WAV filename (UTC)
  call_time_ct              TIMESTAMPTZ,            -- Parsed from portal term_id (Central time, stored as UTC)
  call_date                 DATE,                   -- Local date of call (CT), for fast date filtering

  -- Call metadata
  direction                 call_direction NOT NULL DEFAULT 'unknown',
  from_name                 TEXT,
  from_number               TEXT,
  dialed_number             TEXT,
  to_extension              TEXT,
  duration_seconds          INT,

  -- Agent identification
  -- Confirmed agent is set only when we are certain (e.g. reliable extension match).
  -- Inferred agent is the best guess from transcript + metadata.
  agent_id                  UUID REFERENCES agents(id) ON DELETE SET NULL,
  agent_name_inferred       TEXT,
  agent_match_confidence    NUMERIC(4,2),           -- 0.00 to 1.00
  agent_match_method        TEXT,                   -- e.g. 'extension_lookup', 'transcript_name'

  -- CSV matching (optional enrichment when CSV export is available)
  csv_match_status          TEXT,                   -- 'matched' | 'partial' | 'unmatched'
  csv_match_confidence      NUMERIC(4,2),
  csv_match_method          TEXT,

  -- Processing pipeline state
  processing_status         processing_status NOT NULL DEFAULT 'discovered',
  error_message             TEXT,

  -- Denormalized flags for fast dashboard queries (source of truth is call_analysis)
  primary_category          TEXT,
  sentiment                 call_sentiment DEFAULT 'unknown',
  follow_up_required        BOOLEAN DEFAULT false,
  complaint_flag            BOOLEAN DEFAULT false,
  sales_opportunity_flag    BOOLEAN DEFAULT false,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER calls_updated_at
  BEFORE UPDATE ON calls
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed known agents
INSERT INTO agents (name, display_name, extensions, active) VALUES
  ('Karen Kieffer',   'Karen',   ARRAY['101', '102'], true),
  ('Ashley Terhark',  'Ashley',  ARRAY['102', '103'], true),
  ('Jil Traxinger',   'Jil',     ARRAY['104'],        true);
