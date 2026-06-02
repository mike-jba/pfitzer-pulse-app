-- ============================================================
-- Migration 003: Audit tables, indexes, and RLS policies
-- ============================================================

-- ── call_quality_rubrics ──────────────────────────────────────
-- Configurable scoring rubrics for call quality audits.

CREATE TABLE call_quality_rubrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  version     INT NOT NULL DEFAULT 1,
  -- Array of { id, label, description, max_score, weight }
  criteria    JSONB NOT NULL DEFAULT '[]',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER call_quality_rubrics_updated_at
  BEFORE UPDATE ON call_quality_rubrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── call_quality_audits ───────────────────────────────────────
-- An audit session: one or more calls graded against a rubric.

CREATE TABLE call_quality_audits (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id               UUID NOT NULL REFERENCES call_quality_rubrics(id),
  created_by              UUID REFERENCES app_users(id) ON DELETE SET NULL,
  agent_id                UUID REFERENCES agents(id) ON DELETE SET NULL,
  date_range_start        DATE,
  date_range_end          DATE,
  status                  TEXT NOT NULL DEFAULT 'pending', -- pending | running | complete | failed
  calls_selected          INT DEFAULT 0,
  calls_scored            INT DEFAULT 0,
  overall_score           NUMERIC(5,2),
  strengths               TEXT[],
  coaching_opportunities  TEXT[],
  manager_talking_points  TEXT,
  completed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER call_quality_audits_updated_at
  BEFORE UPDATE ON call_quality_audits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── call_quality_scores ───────────────────────────────────────
-- Individual criterion scores within an audit.

CREATE TABLE call_quality_scores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id             UUID NOT NULL REFERENCES call_quality_audits(id) ON DELETE CASCADE,
  call_id              UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  rubric_criterion_id  TEXT NOT NULL,               -- References criteria[].id in rubric JSONB
  score                NUMERIC(5,2),
  max_score            NUMERIC(5,2),
  transcript_evidence  TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

-- calls — primary access patterns
CREATE INDEX idx_calls_call_date        ON calls (call_date DESC);
CREATE INDEX idx_calls_call_time_ct     ON calls (call_time_ct DESC);
CREATE INDEX idx_calls_agent_id         ON calls (agent_id);
CREATE INDEX idx_calls_primary_category ON calls (primary_category);
CREATE INDEX idx_calls_processing_status ON calls (processing_status);
CREATE INDEX idx_calls_from_number      ON calls (from_number);
CREATE INDEX idx_calls_complaint        ON calls (complaint_flag) WHERE complaint_flag = true;
CREATE INDEX idx_calls_follow_up        ON calls (follow_up_required) WHERE follow_up_required = true;
CREATE INDEX idx_calls_sales_opp        ON calls (sales_opportunity_flag) WHERE sales_opportunity_flag = true;
CREATE INDEX idx_calls_portal_id        ON calls (call_id_portal);

-- call_analysis — dashboard query support
CREATE INDEX idx_call_analysis_category  ON call_analysis (primary_category);
CREATE INDEX idx_call_analysis_sentiment ON call_analysis (sentiment);

-- call_tags — tag filtering
CREATE INDEX idx_call_tags_call_id ON call_tags (call_id);
CREATE INDEX idx_call_tags_tag     ON call_tags (tag);

-- processing_events — pipeline debugging
CREATE INDEX idx_processing_events_call_id    ON processing_events (call_id);
CREATE INDEX idx_processing_events_created_at ON processing_events (created_at DESC);

-- daily_recaps — date lookup
CREATE INDEX idx_daily_recaps_date ON daily_recaps (recap_date DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE agents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls                ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcripts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analysis        ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_recaps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_quality_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_quality_audits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_quality_scores  ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read everything
-- (MVP: Mike, Karen, Garret — all trusted, no need for row-level data isolation)
CREATE POLICY "authenticated_read_agents"
  ON agents FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_app_users"
  ON app_users FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_import_batches"
  ON import_batches FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_calls"
  ON calls FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_call_transcripts"
  ON call_transcripts FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_call_analysis"
  ON call_analysis FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_call_tags"
  ON call_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_daily_recaps"
  ON daily_recaps FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_processing_events"
  ON processing_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_rubrics"
  ON call_quality_rubrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_audits"
  ON call_quality_audits FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_scores"
  ON call_quality_scores FOR SELECT TO authenticated USING (true);

-- Users can manage their own app_users record
CREATE POLICY "users_manage_own_record"
  ON app_users FOR ALL TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- NOTE: All writes from n8n use the service role key, which bypasses RLS.
-- No INSERT/UPDATE policies are needed for the ingestion pipeline.
