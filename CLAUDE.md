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
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (sidebar + header)
│   ├── dashboard/          # /dashboard — KPI cards + charts
│   ├── calls/              # /calls — call explorer table
│   │   └── [id]/           # /calls/[id] — call detail + transcript
│   ├── trends/             # /trends — trend charts
│   ├── recaps/             # /recaps — daily/weekly recap emails
│   ├── audits/             # /audits — call quality audits (later phase)
│   └── settings/           # /settings — admin settings
├── components/
│   ├── layout/             # AppSidebar, Header
│   ├── dashboard/          # KpiCard, CallVolumeChart, CategoryChart
│   └── ui/                 # shadcn/ui components (auto-generated)
├── lib/
│   ├── utils.ts            # shadcn cn() utility
│   ├── mock-data.ts        # Mock data for layout validation (Chunk 1 only)
│   ├── supabase/           # Supabase client setup (Chunk 2)
│   └── parsers/            # Voice for Pest filename/metadata parsers (Chunk 4)
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

## Call Processing Pipeline (n8n)

```
Cron trigger (nightly)
  → Login to atscall.me portal (session cookie)
  → Fetch call list for target date (HTML scrape)
  → For each call:
      → Get pre-signed recording URL
      → Download WAV to VPS /tmp
      → (Optional) Convert with ffmpeg if needed
      → Send to Deepgram for diarized transcription
      → POST transcript to /api/ingest/transcript
      → Send transcript + metadata to Claude for analysis
      → POST analysis to /api/ingest/analysis
      → Delete temp WAV file
  → POST daily recap trigger to /api/ingest/recap
```

## API Routes (Chunks 6+)

All routes are POST-only, server-side only, protected by `Authorization: Bearer <INGEST_SECRET>`.

| Route | Purpose |
|-------|---------|
| `POST /api/ingest/call` | Create/update call record from n8n |
| `POST /api/ingest/transcript` | Store diarized transcript |
| `POST /api/ingest/analysis` | Store Claude AI analysis results |
| `POST /api/processing/event` | Log processing status events |

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
| 4 | Call metadata parser | ⏳ Next |
| 5 | n8n ingestion workflow spec | ⏳ Pending |
| 6 | API routes for processing | ⏳ Pending |
| 7 | AI analysis service | ⏳ Pending |
| 8 | Dashboard with real data | ⏳ Pending |
| 9 | Call explorer | ⏳ Pending |
| 10 | Call detail page | ⏳ Pending |
| 11 | Daily recap emails | ⏳ Pending |
| 12 | Call quality audits | ⏳ Pending |

## Security Rules

1. `SUPABASE_SERVICE_ROLE_KEY` — server-side only, never in client code
2. `INGEST_SECRET` — must be validated on every `/api/ingest/*` and `/api/processing/*` call
3. No `.env.local` in Git — only `.env.local.example`
4. No real customer data in fixtures or tests
5. Validate all n8n payloads with Zod before writing to Supabase
