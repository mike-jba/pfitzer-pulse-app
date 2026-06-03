# External Integrations

**Analysis Date:** 2026-06-03

## APIs & External Services

**AI / Language Models:**
- Anthropic Claude — call analysis (Tier 1 nightly) and call quality auditing (Tier 2 on-demand)
  - SDK: `@anthropic-ai/sdk` 0.100.1
  - Auth: `ANTHROPIC_API_KEY` (server-side only)
  - Tier 1 model: called via n8n HTTP node directly (not via this Next.js app)
  - Tier 2 model: `claude-haiku-4-5-20251001` — called in `src/app/api/audit/run/route.ts`
  - Usage: per-call transcript scoring (30 Voxa criteria), synthesis summary generation
  - Batching: 5 calls per parallel batch in the audit route

**Transcription:**
- Deepgram — speech-to-text with speaker diarization
  - Auth: `DEEPGRAM_API_KEY` (server-side only, used by n8n — not directly by this app)
  - Called via n8n HTTP Request node: `POST https://api.deepgram.com` with binary WAV body
  - Output: diarized transcript (`[Speaker N]: text` format), stored in `call_transcripts`

**Voice Portal:**
- Voice for Pest (ATS Call) — source of call recordings
  - URL: `https://portal.atscall.me`
  - No public API — accessed via HTML scraping + CakePHP session cookie auth from n8n
  - Auth: form POST to `/portal/login/login`; session cookie `CAKEPHP` used for subsequent requests
  - Call list: GET `/portal/callhistory/index/start_date:YYYY-MM-DD/end_date:YYYY-MM-DD` (HTML table)
  - Recording URL: GET `/portal/callhistory/recording/{orig_id}/{term_id}` returns pre-signed time-limited download URL
  - All scraping logic lives in n8n; this app only stores the results

**n8n (self-hosted):**
- Automation orchestrator — owns all pipeline logic
  - Instance: `https://automation.joystoneenterprises.com`
  - Calls this app's API routes via HTTP Request nodes
  - Auth: `Authorization: Bearer <INGEST_SECRET>` on every ingest/processing call
  - Workflows: Nightly Call Ingestion (`gm7c0Xsl7PcEjpxB`), Daily Recap Generator (`n5bZW9UQico9plTS`)

**Email:**
- Gmail (Google Workspace OAuth2) — sends daily recap emails
  - Used exclusively by n8n (Gmail node in recap workflow)
  - Not called from this Next.js app

## Data Storage

**Databases:**
- Supabase Postgres — single system of record for all application data
  - Project ID: `jdoatvotmsmhrmpitzon`
  - URL: `https://jdoatvotmsmhrmpitzon.supabase.co` (env: `NEXT_PUBLIC_SUPABASE_URL`)
  - Region: us-east-2 (Ohio)
  - Client library: `@supabase/supabase-js` 2.106.2 + `@supabase/ssr` 0.10.3
  - Two client modes:
    - `createServerClient()` in `src/lib/supabase/server.ts` — anon key, respects RLS, for authenticated reads
    - `createServiceClient()` in `src/lib/supabase/server.ts` — service role key, bypasses RLS, for n8n ingest routes and dashboard data reads
    - `createClient()` in `src/lib/supabase/client.ts` — browser anon client for client components
  - Schema managed via migrations in `supabase/migrations/`
  - Core tables: `calls`, `call_transcripts`, `call_analysis`, `call_tags`, `agents`, `app_users`, `import_batches`, `daily_recaps`, `processing_events`, `call_quality_rubrics`, `call_quality_audits`, `call_quality_scores`
  - RLS enabled on all tables; authenticated users get full read access; writes from n8n bypass RLS via service role

**File Storage:**
- None — WAV audio files are never persisted; downloaded transiently in n8n binary field, processed, then discarded

**Caching:**
- None — Next.js `unstable_noStore()` is called in data layer functions (e.g. `src/lib/data/dashboard.ts`) to opt out of default fetch caching

## Authentication & Identity

**Auth Provider:**
- Supabase Auth — built-in auth for dashboard users (Karen, Garret, Mike)
  - Implementation: cookie-based session via `@supabase/ssr`; `createServerClient()` reads session from request cookies
  - `app_users` table links `auth.users(id)` to application roles (`admin` | `viewer`)
  - RLS policies use `auth.uid()` to scope `app_users` row access

**Ingest Route Auth:**
- Shared secret (Bearer token) — protects all `/api/ingest/*` and `/api/processing/*` routes from unauthorized writes
  - Implementation: `validateIngestAuth()` in `src/lib/api/ingest-auth.ts`
  - Secret: `INGEST_SECRET` env var; must match value configured in n8n `Code - Config` node
  - Note: `/api/audit/run` does NOT use `validateIngestAuth` — it is called from the browser dashboard, not n8n

## Monitoring & Observability

**Error Tracking:**
- None — no dedicated error tracking service (Sentry, etc.) detected

**Logs:**
- `console.error()` used in API route catch blocks with prefixed context strings (e.g. `[ingest/analysis]`, `[audit/run]`)
- Vercel captures stdout/stderr logs accessible via Vercel dashboard

## CI/CD & Deployment

**Hosting:**
- Vercel — production deployment at `https://pfitzer-pulse-app.vercel.app`
- Deployments triggered by git push to the repo

**CI Pipeline:**
- None detected — no `.github/workflows/` or CI config files present

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (client-safe)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (client-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS; server-only; never expose to browser
- `INGEST_SECRET` — shared secret for n8n → API route authentication; server-only
- `ANTHROPIC_API_KEY` — Anthropic API access; server-only
- `DEEPGRAM_API_KEY` — Deepgram transcription key; used only by n8n (documented here for completeness)

**Secrets location:**
- Development: `.env.local` (gitignored); template at `.env.local.example`
- Production: Vercel environment variables dashboard

## Webhooks & Callbacks

**Incoming (n8n → this app):**
- `POST /api/ingest/call` — registers a call record from the portal; requires `Authorization: Bearer`
- `POST /api/ingest/transcript` — saves Deepgram transcript; requires `Authorization: Bearer`
- `POST /api/ingest/analysis` — saves Claude analysis + denormalizes to `calls`; requires `Authorization: Bearer`
- `POST /api/ingest/recap` — saves daily recap summary; requires `Authorization: Bearer`
- `POST /api/processing/event` — immutable pipeline event log entry; requires `Authorization: Bearer`
- `POST /api/audit/run` — triggers on-demand call quality audit via Claude; called from browser (no Bearer auth)
- `GET /api/audit/call-count` — returns count of auditable calls for a given agent/date range

**Outgoing:**
- Anthropic API — called from `src/app/api/audit/run/route.ts` directly (not via n8n) for Tier 2 audits
- All other outbound calls (Deepgram, portal scraping, Tier 1 Claude) are made from n8n, not this app

---

*Integration audit: 2026-06-03*
