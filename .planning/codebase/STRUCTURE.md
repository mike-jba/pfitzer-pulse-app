# Codebase Structure

**Analysis Date:** 2026-06-03

## Directory Layout

```
pfitzer-pulse-app/
├── src/
│   ├── app/                    # Next.js App Router — pages + API routes
│   │   ├── layout.tsx          # Root layout (sidebar + header shell)
│   │   ├── page.tsx            # Root redirect → /dashboard
│   │   ├── globals.css         # Tailwind base styles
│   │   ├── dashboard/          # /dashboard — KPI cards, charts, recent calls
│   │   ├── calls/              # /calls — call explorer (TanStack Table)
│   │   │   └── [id]/           # /calls/[id] — call detail + transcript + events
│   │   ├── audits/             # /audits — audit list
│   │   │   └── [id]/           # /audits/[id] — scorecard detail
│   │   ├── recaps/             # /recaps — daily recap emails list
│   │   ├── trends/             # /trends — placeholder
│   │   ├── settings/           # /settings — placeholder
│   │   └── api/                # API routes (n8n webhook targets)
│   │       ├── ingest/
│   │       │   ├── call/       # POST — upsert call record
│   │       │   ├── transcript/ # POST — upsert transcript
│   │       │   ├── analysis/   # POST — upsert AI analysis + denorm to calls
│   │       │   └── recap/      # POST — upsert daily recap
│   │       ├── audit/
│   │       │   ├── run/        # POST — trigger Voxa scoring via Claude
│   │       │   └── call-count/ # GET — count eligible calls for audit preview
│   │       └── processing/
│   │           └── event/      # POST — append pipeline event log entry
│   ├── components/             # React components
│   │   ├── layout/             # AppSidebar, Header (persistent chrome)
│   │   ├── dashboard/          # KpiCard, CallVolumeChart, CategoryChart
│   │   ├── calls/              # CallExplorer (TanStack Table, client component)
│   │   ├── audits/             # NewAuditModal, AuditCallButton, ScorecardAccordion
│   │   └── ui/                 # shadcn/ui primitives (auto-generated, do not edit)
│   └── lib/                    # Framework-agnostic logic + infrastructure
│       ├── utils.ts            # shadcn cn() utility (Tailwind class merge)
│       ├── mock-data.ts        # Scaffold-era mock data (no longer used in prod)
│       ├── voxa-rubric.ts      # Voxa DNA 30-criterion framework definition
│       ├── audit-prompt.ts     # buildScoringPrompt(), buildSynthesisPrompt()
│       ├── audit-scoring.ts    # computeCallScore(), aggregateScores()
│       ├── audit-prompt.test.ts
│       ├── audit-scoring.test.ts
│       ├── parsers/
│       │   ├── call-metadata.ts       # Portal data parser (buildCallRecord + helpers)
│       │   └── call-metadata.test.ts  # 31 unit tests
│       ├── data/               # Supabase query functions (server-only)
│       │   ├── dashboard.ts    # getDashboardData() — KPIs, volume, categories
│       │   ├── calls.ts        # getCalls() — full call list
│       │   ├── call-detail.ts  # getCallDetail(), parseTranscript()
│       │   └── audits.ts       # getAuditsList(), getAuditDetail(), getActiveAgents()
│       ├── api/
│       │   ├── ingest-auth.ts  # validateIngestAuth() — Bearer token check
│       │   └── schemas.ts      # Shared Zod enums: processingStatus, sentiment, direction, VALID_CATEGORIES
│       └── supabase/
│           ├── client.ts       # Browser anon client (for future client components)
│           ├── server.ts       # createServerClient() + createServiceClient()
│           └── types.ts        # Database type stubs (Record<string,unknown> — not generated yet)
├── .planning/                  # GSD planning documents
│   └── codebase/               # Codebase analysis docs
├── .vercel/                    # Vercel project metadata
├── package.json
├── tsconfig.json               # strict mode, @/* → ./src/* alias
├── jest.config.ts
├── components.json             # shadcn/ui configuration
├── CLAUDE.md                   # Project guidance for Claude Code
└── .env.local.example          # Required env var template
```

## Directory Purposes

**`src/app/`:**
- Purpose: All Next.js routing — pages, layouts, API route handlers
- Contains: `page.tsx` (async RSC), `layout.tsx`, `route.ts` (API handlers)
- Key files: `src/app/layout.tsx` (root shell), `src/app/page.tsx` (root redirect)

**`src/app/api/`:**
- Purpose: HTTP endpoints consumed by n8n automation and internal browser actions
- Contains: `route.ts` files exporting `POST` (or `GET` for call-count)
- Key files: `src/app/api/ingest/call/route.ts`, `src/app/api/audit/run/route.ts`

**`src/components/`:**
- Purpose: Reusable React components grouped by feature domain
- Contains: Feature dirs (`dashboard/`, `calls/`, `audits/`, `layout/`) and `ui/` primitives
- Key files: `src/components/layout/app-sidebar.tsx`, `src/components/calls/call-explorer.tsx`
- Note: `ui/` is managed by shadcn CLI — do not manually edit files there

**`src/lib/data/`:**
- Purpose: All Supabase read queries — one file per page/feature domain
- Contains: Async functions returning typed plain objects; all marked `server-only`
- Key files: `src/lib/data/dashboard.ts`, `src/lib/data/audits.ts`

**`src/lib/parsers/`:**
- Purpose: Portal data normalization — pure functions with no framework dependencies
- Key files: `src/lib/parsers/call-metadata.ts` (31 unit tests)

**`src/lib/supabase/`:**
- Purpose: Supabase client factories and DB type definitions
- Key files: `src/lib/supabase/server.ts` (two-client pattern), `src/lib/supabase/types.ts`

**`src/lib/api/`:**
- Purpose: Shared API utilities — auth validation and Zod enum schemas
- Key files: `src/lib/api/ingest-auth.ts`, `src/lib/api/schemas.ts`

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Root → redirects to `/dashboard`
- `src/app/layout.tsx`: Root layout with sidebar + header
- `src/app/dashboard/page.tsx`: Main dashboard RSC

**Configuration:**
- `tsconfig.json`: TypeScript config with `@/*` path alias
- `components.json`: shadcn/ui component config
- `.env.local.example`: All required environment variables

**Core Logic:**
- `src/lib/parsers/call-metadata.ts`: Portal data parsing (`buildCallRecord`)
- `src/lib/api/schemas.ts`: Controlled category list + shared Zod enums
- `src/lib/voxa-rubric.ts`: Voxa DNA 30-criterion definition
- `src/lib/audit-scoring.ts`: Score computation + aggregation
- `src/lib/audit-prompt.ts`: Claude prompt builders

**Data Access:**
- `src/lib/data/dashboard.ts`: `getDashboardData()` — parallel KPI queries
- `src/lib/data/calls.ts`: `getCalls()` — call list with embedded analysis
- `src/lib/data/call-detail.ts`: `getCallDetail()`, `parseTranscript()`
- `src/lib/data/audits.ts`: `getAuditsList()`, `getAuditDetail()`, `getActiveAgents()`

**Supabase Infrastructure:**
- `src/lib/supabase/server.ts`: `createServiceClient()` (RLS bypass) + `createServerClient()` (RLS-respecting)
- `src/lib/supabase/client.ts`: Browser anon client

**Testing:**
- `src/lib/parsers/call-metadata.test.ts`: 31 tests for portal parser
- `src/lib/audit-prompt.test.ts`: Audit prompt tests
- `src/lib/audit-scoring.test.ts`: Scoring logic tests

## Naming Conventions

**Files:**
- Pages: `page.tsx` (always)
- API routes: `route.ts` (always)
- Components: `kebab-case.tsx` (e.g., `app-sidebar.tsx`, `kpi-card.tsx`)
- Lib modules: `kebab-case.ts` (e.g., `call-metadata.ts`, `audit-scoring.ts`)
- Tests: `*.test.ts` co-located with source (e.g., `call-metadata.test.ts`)

**Directories:**
- Feature grouping: `kebab-case` (e.g., `call-detail`, `audits`)
- Dynamic segments: Next.js convention `[id]` (e.g., `calls/[id]/`)
- API namespace: matches route path (e.g., `api/ingest/call/`)

**Exports:**
- Data functions: camelCase verb+noun (`getDashboardData`, `getAuditDetail`)
- Parsers: camelCase verb+noun (`buildCallRecord`, `parseTermId`)
- Types: PascalCase (`CallListRow`, `AuditDetailData`, `ParsedCallMetadata`)
- Zod schemas: camelCase with `Schema` suffix (`processingStatusSchema`, `BodySchema`)
- Constants: SCREAMING_SNAKE (`VALID_CATEGORIES`, `VOXA_RUBRIC_NAME`, `VOXA_SECTIONS`)

## Where to Add New Code

**New dashboard page:**
- Create `src/app/<route-name>/page.tsx` (async RSC)
- Add data fetcher at `src/lib/data/<domain>.ts`
- Add nav link to `src/components/layout/app-sidebar.tsx`

**New API route (n8n ingest):**
- Create `src/app/api/ingest/<name>/route.ts`
- Add inline `BodySchema` with Zod v4
- Call `validateIngestAuth(request)` first
- Use `createServiceClient()` for DB writes

**New feature component:**
- Server component (pure display): place in `src/components/<feature>/` as `.tsx`
- Client component (interactive): add `"use client"` directive at top; same location
- shadcn primitive: run `npx shadcn add <component>` → auto-placed in `src/components/ui/`

**New parser/business logic:**
- Place in `src/lib/` as a pure TypeScript module
- Add co-located `*.test.ts` file

**New Supabase query:**
- Add to the relevant file in `src/lib/data/` or create a new file
- Always add `import 'server-only'` and `noStore()` at the top
- Return typed plain objects, not raw Supabase generics

**New shared Zod enum:**
- Add to `src/lib/api/schemas.ts`

## Special Directories

**`src/components/ui/`:**
- Purpose: shadcn/ui auto-generated primitives (Button, Card, Badge, Dialog, Sheet, etc.)
- Generated: Yes (via `npx shadcn add`)
- Committed: Yes
- Note: Do not manually edit; re-run shadcn CLI to update

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by `/gsd:map-codebase`)
- Committed: Yes (tracks project understanding)

**`.vercel/`:**
- Purpose: Vercel project linkage metadata
- Generated: Yes (Vercel CLI)
- Committed: Yes

---

*Structure analysis: 2026-06-03*
