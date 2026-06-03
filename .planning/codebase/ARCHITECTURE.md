# Architecture

**Analysis Date:** 2026-06-03

## Pattern Overview

**Overall:** Dual-purpose Next.js App Router application — read-heavy dashboard (RSC) + write-only ingestion API (n8n webhook target)

**Key Characteristics:**
- Supabase is the single source of truth; n8n writes exclusively via API routes, Next.js reads exclusively via server components
- Two Supabase client modes: `createServiceClient()` (bypasses RLS, used by ingest routes and data fetchers) and `createServerClient()` (anon key, RLS-respecting, for authenticated user reads)
- No client-side data fetching — all Supabase reads happen server-side in async React Server Components or `lib/data/` functions
- `server-only` import guard applied to all Supabase server clients and data layer functions to prevent accidental browser exposure

## Layers

**Routing Layer (App Router pages):**
- Purpose: Render UI — fetch data from `lib/data/`, pass to components
- Location: `src/app/`
- Contains: `page.tsx` files (async RSC), `layout.tsx`, dynamic routes like `calls/[id]/page.tsx`
- Depends on: `lib/data/`, `components/`
- Used by: Browser

**API Routes Layer (n8n webhook targets):**
- Purpose: Receive HTTP POSTs from n8n, validate with Zod, write to Supabase
- Location: `src/app/api/`
- Contains: `route.ts` files, each exporting `POST`
- Depends on: `lib/api/ingest-auth.ts`, `lib/api/schemas.ts`, `lib/parsers/call-metadata.ts`, `lib/supabase/server.ts`
- Used by: n8n automation workflows

**Data Access Layer:**
- Purpose: Typed Supabase queries for dashboard pages, call explorer, audits
- Location: `src/lib/data/`
- Contains: `dashboard.ts`, `calls.ts`, `call-detail.ts`, `audits.ts`
- Depends on: `lib/supabase/server.ts`
- Used by: `app/` pages

**Business Logic Layer:**
- Purpose: Parsing, scoring, and prompt generation — framework-agnostic TypeScript
- Location: `src/lib/`
- Contains: `parsers/call-metadata.ts`, `audit-scoring.ts`, `audit-prompt.ts`, `voxa-rubric.ts`
- Depends on: Nothing (pure functions)
- Used by: API routes, tests

**Component Layer:**
- Purpose: UI rendering — charts, tables, modals, layout chrome
- Location: `src/components/`
- Contains: feature-grouped subdirs (`dashboard/`, `calls/`, `audits/`, `layout/`) plus `ui/` (shadcn primitives)
- Depends on: shadcn/ui primitives, Recharts, TanStack Table, Lucide icons
- Used by: `app/` pages

**Infrastructure Layer:**
- Purpose: Supabase client factories, Zod schemas, auth helpers
- Location: `src/lib/api/`, `src/lib/supabase/`
- Contains: `ingest-auth.ts`, `schemas.ts`, `client.ts`, `server.ts`, `types.ts`
- Depends on: Supabase JS, Zod, env vars
- Used by: API routes, data access layer

## Data Flow

**Nightly Ingestion (n8n → App → Supabase):**

1. n8n sends `POST /api/ingest/call` with raw portal fields
2. `validateIngestAuth()` checks `Authorization: Bearer <INGEST_SECRET>`
3. Zod schema validates body; `buildCallRecord()` parses portal data into normalized metadata
4. `createServiceClient()` upserts to `calls` table (conflict on `call_id_portal`)
5. n8n sends `POST /api/ingest/transcript` — upserts to `call_transcripts`, advances status to `transcribed`
6. n8n sends `POST /api/ingest/analysis` — upserts to `call_analysis`, denormalizes key signals (category, sentiment, flags) back to `calls`, advances status to `complete`

**Dashboard Read Flow (Browser → Vercel → Supabase):**

1. User navigates to `/dashboard`
2. Next.js RSC executes `getDashboardData()` server-side
3. `createServiceClient()` fires 5 parallel Supabase queries (yesterday count, week count, month metrics, call volume, recent calls)
4. Aggregation and formatting happen in-process (Node.js)
5. Rendered HTML streamed to browser; no client-side fetching

**On-Demand Audit Flow (Browser → `/api/audit/run` → Anthropic → Supabase):**

1. User opens `NewAuditModal`, selects agent + date range, submits
2. Client POSTs to `POST /api/audit/run`
3. Route resolves eligible calls (by `agent_name_inferred` ILIKE match), fetches transcripts
4. Each call scored in parallel batches of 5 via Anthropic Claude Haiku (`claude-haiku-4-5-20251001`)
5. Scores persisted to `call_quality_scores`; synthesis prompt generates strengths/coaching
6. Audit record updated to `complete` in `call_quality_audits`

**State Management:**
- No client-side state management library. Server components own all data fetching.
- Client components (`"use client"`) are limited to interactive UI: `AppSidebar` (pathname-active nav), `NewAuditModal`, `AuditCallButton`, `CallExplorer` (TanStack Table filtering/sorting/pagination), chart components (Recharts requires browser APIs)

## Key Abstractions

**`buildCallRecord()` (canonical portal parser):**
- Purpose: Converts raw Voice for Pest portal fields into a normalized `ParsedCallMetadata` object ready for the `calls` table
- Location: `src/lib/parsers/call-metadata.ts`
- Pattern: Pure function; called inside `POST /api/ingest/call` so all parsing lives in TypeScript, not n8n Code nodes
- Exports: `parseTermId`, `parseWavFilename`, `parseDuration`, `normalizePhoneNumber`, `inferDirection`, `buildCallRecord`

**`createServiceClient()` / `createServerClient()`:**
- Purpose: Two distinct Supabase clients with different trust levels
- Location: `src/lib/supabase/server.ts`
- Pattern: `createServiceClient()` uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS); `createServerClient()` uses anon key with user session cookies
- Currently: `createServiceClient()` is used everywhere (auth not yet fully enforced)

**`validateIngestAuth()`:**
- Purpose: Bearer token authentication for all n8n → API route calls
- Location: `src/lib/api/ingest-auth.ts`
- Pattern: Checks `Authorization: Bearer <INGEST_SECRET>` header; returns boolean

**`VOXA_CRITERIA` / `VOXA_RUBRIC_NAME`:**
- Purpose: Defines the 30-criterion Voxa DNA scoring framework as a static data structure
- Location: `src/lib/voxa-rubric.ts`
- Pattern: Lazy-seeded to `call_quality_rubrics` table on first audit run

**Data Layer Functions (lib/data/):**
- Purpose: Typed wrappers over Supabase queries — one file per page domain
- Examples: `src/lib/data/dashboard.ts`, `src/lib/data/calls.ts`, `src/lib/data/call-detail.ts`, `src/lib/data/audits.ts`
- Pattern: All marked `server-only`, use `noStore()` to opt out of Next.js caching, return typed plain objects (not Supabase generics)

## Entry Points

**Root Redirect:**
- Location: `src/app/page.tsx`
- Triggers: GET `/`
- Responsibilities: Redirects to `/dashboard`

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page render
- Responsibilities: Renders `AppSidebar` + `Header` shell; wraps all page content in `<main>`

**API Routes:**
- Location: `src/app/api/`
- Triggers: HTTP POST from n8n or browser (audit/run)
- Pattern: `export async function POST(request: Request)` — validate auth → validate body with Zod → Supabase operation → JSON response

## Error Handling

**Strategy:** Fail fast with structured JSON responses on API routes; graceful degradation (empty arrays / null) on data fetch failures for RSC pages

**Patterns:**
- API routes: `validateIngestAuth()` → 401; Zod `safeParse()` → 422 with `error.flatten()`; Supabase errors → 500 with `error.message`; success → `{ ok: true, id }`
- Data layer: `console.error(...)` + return empty array/null on Supabase error (pages render with empty state rather than crashing)
- Audit route: Try/catch around full scoring loop; on failure, sets `call_quality_audits.status = 'failed'` before returning 500

## Cross-Cutting Concerns

**Logging:** `console.error('[route-name]', error)` pattern — prefixed with route name for log filtering in Vercel

**Validation:** Zod v4 on all API routes; schemas in `src/lib/api/schemas.ts` for shared enums; inline schemas per route for request bodies

**Authentication:** n8n routes use Bearer token (`INGEST_SECRET`). User-facing routes have no auth guard yet (`/api/audit/run` has auth removed per CLAUDE.md). Supabase Auth infrastructure is present but not enforced.

**Timezone Handling:** All timestamps stored UTC in Supabase. Display formatted to `America/Chicago` via `Intl.DateTimeFormat` or `toLocaleString` with `timeZone: 'America/Chicago'`. Portal `term_id` timestamps are Central Time — `parseTermId()` performs the CT→UTC conversion.

**Denormalization:** `call_analysis` stores full AI output; key signals (`primary_category`, `sentiment`, flags) are denormalized back to `calls` by `POST /api/ingest/analysis` for fast dashboard queries without joins.

---

*Architecture analysis: 2026-06-03*
