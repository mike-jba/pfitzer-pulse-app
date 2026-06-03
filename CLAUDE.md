# Pfitzer Pulse — CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Purpose

Pfitzer Pulse is an internal call intelligence dashboard for Pfitzer Pest Control.
It automatically processes phone call recordings from Voice for Pest (portal.atscall.me),
transcribes them via Deepgram, analyzes them with Claude (Anthropic), and displays
insights in a professional web dashboard for Karen Kieffer and Garret Pfitzer.

## Architecture Overview

```
Voice for Pest Portal (atscall.me)
  ↓  (HTML scrape + signed download URL)
n8n on Hostinger VPS
  ↓  (HTTP POST to Next.js API routes)
Next.js API Routes (server-side only)
  ↓  (Supabase service role key)
Supabase Postgres (system of record)
  ↑  (Supabase anon key, server components)
Next.js App (Vercel) → Dashboard for Karen & Garret
```

**Key principles:**
- Supabase is the single source of truth. n8n writes; Next.js reads.
- n8n owns all automation and orchestration.
- The Next.js app displays data and exposes secure API endpoints for n8n.
- No WAV files are stored long-term. Download → process → delete.
- All secrets stay server-side. Never use NEXT_PUBLIC for anything sensitive.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Table | TanStack Table (Chunk 9+) |
| Database | Supabase Postgres |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Automation | n8n (self-hosted on Hostinger VPS) |
| Transcription | Deepgram (diarization required) |
| AI Analysis | Anthropic Claude (structured JSON output) |
| Icons | Lucide React |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (sidebar + header)
│   ├── dashboard/              # /dashboard — KPI cards + charts
│   ├── calls/[id]/             # /calls/[id] — call detail + transcript
│   ├── trends/, recaps/, audits/, settings/
│   └── api/                    # n8n ingestion endpoints (Chunk 6) ✅
│       ├── ingest/call/        # POST — upserts call record, runs buildCallRecord()
│       ├── ingest/transcript/  # POST — upserts Deepgram transcript
│       ├── ingest/analysis/    # POST — upserts Claude analysis, denorms to calls
│       └── processing/event/   # POST — immutable pipeline event log
├── components/
│   ├── layout/                 # AppSidebar, Header
│   ├── dashboard/              # KpiCard, CallVolumeChart, CategoryChart
│   └── ui/                     # shadcn/ui components (auto-generated)
└── lib/
    ├── utils.ts                # shadcn cn() utility
    ├── mock-data.ts            # Mock data for layout validation (Chunk 1 only)
    ├── supabase/
    │   ├── client.ts           # Anon client (browser/server components)
    │   ├── server.ts           # createServerClient() + createServiceClient()
    │   └── types.ts            # DB type stubs (replace with generated types later)
    ├── parsers/
    │   ├── call-metadata.ts    # Portal data parsing: parseTermId, parseWavFilename,
    │   │                       #   parseDuration, normalizePhoneNumber, inferDirection,
    │   │                       #   buildCallRecord — 31 unit tests ✅
    │   └── call-metadata.test.ts
    └── api/
        ├── ingest-auth.ts      # validateIngestAuth() — Bearer token check
        └── schemas.ts          # Zod enums: processingStatus, sentiment, direction,
                                #   VALID_CATEGORIES (14-item controlled list)
```

## Supabase Project

| | |
|---|---|
| **Project name** | pfitzer-pulse-app |
| **Project ID** | `jdoatvotmsmhrmpitzon` |
| **URL** | `https://jdoatvotmsmhrmpitzon.supabase.co` |
| **Region** | us-east-2 (Ohio) |
| **Dashboard** | https://supabase.com/dashboard/project/jdoatvotmsmhrmpitzon |

Note: The old `pfitzer-pulse` project (ID: `siuythdokmgsmbjnbhwo`) still exists and the legacy
Python pipeline writes to it nightly. Do not modify that project. The new app uses this one only.

## Environment Variables

See `.env.local.example` for all required variables.

**Client-safe (NEXT_PUBLIC):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Server-only (never expose to browser):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `INGEST_SECRET` — shared secret for n8n → API route authentication
- `ANTHROPIC_API_KEY`
- `DEEPGRAM_API_KEY`

## Development

```bash
npm run dev     # Start dev server at http://localhost:3000
npm run build   # Production build
npm run lint    # ESLint
npm test        # Jest unit tests (31 tests in src/lib/parsers/)
```

## Voice for Pest Integration

The portal at `https://portal.atscall.me` has no public API. Access is via:

1. **Auth:** POST form credentials to `/portal/login/login` (CakePHP session cookie)
2. **Call list:** GET `/portal/callhistory/index/start_date:YYYY-MM-DD/end_date:YYYY-MM-DD` — returns HTML table
3. **Recording URL:** GET `/portal/callhistory/recording/{orig_id}/{term_id}` — returns pre-signed time-limited download URL
4. **Download:** Stream from signed URL (no auth needed on the URL itself)

**Important:** Portal timestamps in `term_id` are **Central Time**, not UTC.
WAV filenames (e.g. `aud-20260519200459047604-hash-token.wav`) appear to use UTC.
Always store timestamps in UTC in the database; display in Central time.

All portal scraping logic lives in n8n (HTTP Request nodes + Code node for HTML parsing).
Reference implementation: `C:\Users\Admin\Automation\pfitzer-pest-control\pfitzer-pulse\portal_client.py`

## Call Processing Pipeline (n8n) ✅

Workflow **"Pfitzer Pulse - Nightly Call Ingestion"** — ID: `gm7c0Xsl7PcEjpxB`
on `automation.joystoneenterprises.com`. **Tested on real data (33 calls processed,
June 1 2026).** Inactive — needs Code - Config date reverted to dynamic before activating.

Fires at 6 PM CT daily (`0 18 * * *`).

```
Schedule Trigger (6 PM CT)
  → Code - Config (targetDate = yesterday CT, credentials)
  → HTTP - Load Login Page (GET /portal/login — primes CakePHP session cookie)
  → HTTP - Portal Login (POST form, neverError, no redirect follow)
  → Code - Extract Cookie (merge GET+POST cookies, validate /portal/home redirect)
  → HTTP - Set Page Size (GET /pager/200)
  → HTTP - Fetch Call List (GET /index/start_date:D/end_date:D)
  → Code - Parse HTML (regex parse <tr data-orig-id> rows → parallel items)
  [all calls fan out in parallel — no Split In Batches]
  → HTTP - Register Call (POST /api/ingest/call → get call UUID)
  → HTTP - Get Recording (GET /callhistory/recording/{orig}/{term}, Response: JSON)
  → Code - Extract Recording (normalize response, extract status + signedUrl)
  → IF - Has Recording (status === 'converted')
      TRUE →
        HTTP - Download Audio (GET signedUrl → binary field 'audioFile')
        HTTP - Send to Deepgram (POST binary, Content-Type: audio/wav, Response: JSON)
          [Batching: 2 per batch / 10,000ms]
        Code - Parse Deepgram (build diarized [Speaker N]: text from words[].speaker)
        HTTP - Save Transcript (POST /api/ingest/transcript)
        Code - Build Prompt (Claude analysis prompt with metadata + transcript)
        HTTP - Claude Analysis (POST api.anthropic.com/v1/messages, timeout: 120s)
          [Batching: 2 per batch / 10,000ms — prevents Anthropic 429 rate limit]
        Code - Parse Analysis (extract JSON from Claude response, calc cost_usd)
        HTTP - Save Analysis (POST /api/ingest/analysis)
      FALSE → (skip — no recording)
```

**Key implementation notes:**
- WAV files never saved to disk — signed URL downloaded directly into n8n binary field
- n8n 2.23.2 task runner sandbox blocks fetch/$helpers/require in Code nodes — use HTTP Request nodes for all HTTP calls
- HTTP - Get Recording must have Response Format = JSON (portal omits Content-Type header)
- All Code nodes: "Run Once for Each Item" mode, return `{ json: {...} }` (no array wrapper)
- Batching on Claude Analysis required — 5/2s fails, 2/10s reliable

## n8n Workflow Setup

Credentials are already filled in `Code - Config`. Before activating, revert
the hardcoded test date to dynamic:

```javascript
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const targetDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(yesterday);
```

| Field | Status |
|-------|--------|
| `nextjsBase` | `https://pfitzer-pulse-app.vercel.app` ✅ |
| `portalUsername` | `299@pfitzerpestcontrol` ✅ |
| `portalPassword` | Filled ✅ |
| `deepgramKey` | Filled ✅ |
| `anthropicKey` | Filled ✅ |
| `ingestSecret` | Matches Vercel env ✅ |

**Security note:** Exported workflow JSON contains all credentials in plaintext.
Do not commit or share exported workflow files.

## API Routes ✅

All routes are POST-only, server-side, protected by `Authorization: Bearer <INGEST_SECRET>`,
validated with Zod v4 before any Supabase write.

| Route | What it does |
|-------|-------------|
| `POST /api/ingest/call` | Upserts call record (conflict: `call_id_portal`); runs `buildCallRecord()` internally so parsing stays in canonical TypeScript |
| `POST /api/ingest/transcript` | Upserts Deepgram transcript; advances call status → `transcribed` |
| `POST /api/ingest/analysis` | Upserts Claude analysis; denormalizes `primary_category`, `sentiment`, flags back to `calls`; advances status → `complete` |
| `POST /api/processing/event` | Inserts immutable pipeline event log entry |

**Important Zod v4 notes:**
- `z.record()` requires two arguments: `z.record(z.string(), z.unknown())`
- Nullable fields must use `z.string().nullable().optional()` — Claude returns `null` for fields it cannot infer (e.g. `customer_name_inferred`). `z.string().optional()` rejects null.

**Important Supabase types note:** The `Database` type stubs in `src/lib/supabase/types.ts`
require `Relationships: []` on each table entry for Supabase JS v2.106+ compatibility.

## Call Categories (Controlled List)

AI must use ONLY these primary categories:

- New Customer / Sales Opportunity
- Scheduling
- Rescheduling
- Billing / Invoice
- Payment
- Complaint
- Compliment
- Service Question
- Pest Activity
- Technician Follow-up
- Cancellation / Retention
- Vendor / Internal
- Voicemail
- Other

## Database Tables (Chunk 3)

Core tables: `calls`, `call_transcripts`, `call_analysis`, `call_tags`,
`agents`, `app_users`, `import_batches`, `daily_recaps`, `processing_events`,
`call_quality_rubrics`, `call_quality_audits`, `call_quality_scores`

`calls` is the central table. UUID primary keys everywhere.

## Known Business Context

- **Karen Kieffer** and **Ashley Terhark** — office agents (may share extensions)
- **Jil Traxinger** — office agent
- **Garret Pfitzer** — owner/operator
- **Technicians:** Dane, Eric, Tyler, Alden, Teagan, Jared
- Call volume: ~30–70/day at peak, avg ~2 min per call
- Recordings available ~1 year back in portal

## Build Sequence (Reference)

| Chunk | Description | Status |
|-------|-------------|--------|
| 1 | Scaffold app | ✅ Complete |
| 2 | Supabase integration | ✅ Complete |
| 3 | Database schema | ✅ Complete |
| 4 | Call metadata parser | ✅ Complete |
| 5 | n8n ingestion workflow | ✅ Complete — ID: gm7c0Xsl7PcEjpxB — 33 calls processed in prod |
| 6 | API routes for processing | ✅ Complete |
| 7 | AI analysis (Claude via n8n) | ✅ Complete — ~$0.009/call, 2/10s batching |
| 8 | Dashboard with real data | ⏳ Next |
| 9 | Call explorer | ⏳ Pending |
| 10 | Call detail page | ⏳ Pending |
| 11 | Daily recap emails | ⏳ Pending |
| 12 | Call quality audits (Voxa CSR scoring) | ⏳ Pending |

## Call Analysis Architecture (Two-Tier)

**Tier 1 — Nightly, automatic (Chunk 7 ✅):** Runs on every call via n8n pipeline.
Fast and cheap (~$0.009/call). Fields: category, summaries, sentiment, booking_made,
call_outcome, topics_discussed, tags, pest_types, flags. Results → `call_analysis`.

**Tier 2 — On-demand CSR audit (Chunk 12):** Karen or Garret selects calls for a
specific agent. Triggers a separate Claude API call with the full Voxa 24-criteria
prompt (see `docs/voxa-scoring-framework.md`). Scores all 24 E-Words criteria across
6 sections (Enthusiasm, Engage, Empathy, Encourage, Educate, Extra Mile). Generates
a performance report. Results → `call_quality_audits` + `call_quality_scores`.

**Critical separation:** The Voxa framework and its 24 criteria belong ONLY in the
Chunk 12 prompt. Do NOT include CSR performance scoring in the Tier 1 nightly prompt.

## Security Rules

1. `SUPABASE_SERVICE_ROLE_KEY` — server-side only, never in client code
2. `INGEST_SECRET` — must be validated on every `/api/ingest/*` and `/api/processing/*` call
3. No `.env.local` in Git — only `.env.local.example`
4. No real customer data in fixtures or tests
5. Validate all n8n payloads with Zod before writing to Supabase
