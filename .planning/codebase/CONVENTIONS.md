# Coding Conventions

**Analysis Date:** 2026-06-03

## Naming Patterns

**Files:**
- React components: kebab-case `.tsx` (e.g., `kpi-card.tsx`, `app-sidebar.tsx`, `new-audit-modal.tsx`)
- API routes: directory-per-route with `route.ts` (e.g., `src/app/api/ingest/call/route.ts`)
- Data access modules: kebab-case `.ts` in `src/lib/data/` (e.g., `calls.ts`, `audits.ts`, `dashboard.ts`)
- Parser modules: kebab-case `.ts` in `src/lib/parsers/` (e.g., `call-metadata.ts`)
- Test files: co-located, same name with `.test.ts` suffix (e.g., `call-metadata.test.ts`, `audit-scoring.test.ts`)

**Functions:**
- Exported functions: camelCase verbs (e.g., `buildCallRecord`, `parseTermId`, `normalizePhoneNumber`, `computeCallScore`, `aggregateScores`)
- React components: PascalCase (e.g., `KpiCard`, `AppSidebar`, `NewAuditModal`)
- Data fetching functions: camelCase prefixed with `get` (e.g., `getCalls`, `getAuditsList`, `getActiveAgents`, `getAuditDetail`)
- Local helpers: camelCase (e.g., `fmt`, `fmtTime`, `fmtDate`, `fmtScore`, `scoreColor`)
- Zod schemas: camelCase suffixed with `Schema` (e.g., `BodySchema`, `processingStatusSchema`, `callDirectionSchema`)

**Variables:**
- camelCase throughout
- Destructured from results: `const { data, error } = await supabase...`
- Error variable pattern distinguishes multiple errors: `analysisError`, `callsError`, `rubricReadError`

**Types and Interfaces:**
- PascalCase for `interface` (e.g., `PortalCallRow`, `ParsedCallMetadata`, `KpiCardProps`)
- PascalCase for `type` aliases (e.g., `CallListRow`, `AuditListItem`, `Flag`, `CriterionResult`)
- Exported type aliases used for data layer return shapes (e.g., `CallListRow` from `src/lib/data/calls.ts`)

**Constants:**
- `SCREAMING_SNAKE_CASE` for top-level immutable arrays/objects (e.g., `VALID_CATEGORIES`, `FLAG_POINTS`, `VOXA_CRITERIA`, `VOXA_RUBRIC_NAME`)

## Code Style

**Formatting:**
- No Prettier config detected; formatting is consistent with Next.js defaults
- Single quotes in `.ts`/API route files (e.g., `import 'server-only'`)
- Double quotes in `.tsx` component files (e.g., `import { cn } from "@/lib/utils"`)
- Trailing commas used in multi-line objects and arrays
- Semicolons omitted in `.ts` parser/lib files; present in `.tsx` component files

**Linting:**
- ESLint with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config: `eslint.config.mjs`
- TypeScript `strict: true` enforced via `tsconfig.json`

## Import Organization

**Order (observed pattern):**
1. Framework/runtime imports (`'server-only'`, `next/server`, `next/cache`, `next/navigation`)
2. Third-party libraries (`zod`, `@anthropic-ai/sdk`, `lucide-react`, `recharts`)
3. Internal aliases using `@/` path alias (e.g., `@/lib/supabase/server`, `@/components/ui/card`, `@/lib/api/schemas`)

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- Use `@/` for all internal imports — never relative paths across directories

**Barrel Files:**
- Not used. Import directly from the module file.

## Server vs Client Boundary

**Server-only modules** (must include `import 'server-only'` at top):
- All files in `src/lib/data/` (e.g., `calls.ts`, `audits.ts`, `dashboard.ts`)
- `src/lib/supabase/server.ts`
- All files in `src/app/api/**/route.ts`

**Client components** (must include `'use client'` directive at top):
- Interactive components with hooks: `src/components/audits/new-audit-modal.tsx`, `src/components/audits/audit-call-button.tsx`, `src/components/layout/app-sidebar.tsx`
- Components using `useState`, `useEffect`, `useCallback`, `useRouter`, `usePathname`

**Server components** (default, no directive needed):
- All page files in `src/app/**/page.tsx` (they are async functions fetching data directly)

## Error Handling

**API routes — consistent three-layer pattern:**
1. Auth check: `if (!validateIngestAuth(request)) return 401`
2. JSON parse in try/catch: returns `{ ok: false, error: 'Invalid JSON' }` with status 400
3. Zod validation with `.safeParse()`: returns `{ ok: false, error: 'Validation failed', details: parsed.error.flatten() }` with status 422
4. Supabase error check: `if (error) { console.error('[route-name]', error); return 500 }`

**Response shape:** Always `{ ok: boolean, ... }` — success includes `id` or relevant data; failure includes `error` string.

**Non-fatal errors:** Secondary DB operations (denorm updates) log the error but don't fail the request (see `[ingest/analysis] calls denorm update` pattern in `src/app/api/ingest/analysis/route.ts`).

**Data fetching functions:** Return empty array `[]` on error (never throw). Log with `console.error('[function-name]', error)`.

**Client-side error handling:** Caught in try/catch inside form submit handlers; displayed in local `error` state as `text-red-600` text.

**Error in catch blocks:** Use `err instanceof Error ? err.message : String(err)` to safely extract message.

## Logging

**Framework:** `console.error` only (no logging library)

**Patterns:**
- All `console.error` calls include a bracketed route/function identifier as first argument: `console.error('[ingest/call]', error)`, `console.error('[getCalls]', error)`, `console.error('[audit/run]', msg)`
- `console.log` used for operational visibility in long-running routes: `console.log(\`[audit/run] ${n} calls resolved...\`)`
- Never log sensitive data (credentials, full request bodies)

## Comments

**Section dividers in pure TypeScript files:**
```ts
// ─── Section Name ────────────────────────────────────────────────────────────
```
Used in `src/lib/parsers/call-metadata.ts` to separate logical groups of functions.

**JSDoc on exported functions:**
- Used on complex logic that needs explanation (e.g., `parseTermId`, `parseWavFilename`, `normalizePhoneNumber`, `inferDirection` in `src/lib/parsers/call-metadata.ts`)
- Explains *why*, not just what — DST handling rationale, normalization rules

**Inline comments:**
- Used to explain non-obvious decisions: `// n8n sends the raw portal fields...`, `// Non-fatal if this update fails`
- Supabase client file has module-level JSDoc block explaining the two-client architecture

## Function Design

**Size:** Functions are small and single-purpose. Parsers (`parseTermId`, `parseDuration`, `normalizePhoneNumber`) are 10–20 lines. Complex orchestration (`POST` in `src/app/api/audit/run/route.ts`) is the exception, structured with numbered step comments.

**Parameters:** 
- Pure functions take explicit typed parameters
- Complex inputs use named object types (e.g., `ScoringPromptInput`, `PortalCallRow`)

**Return Values:**
- Nullable fields use `T | null` (not `undefined`) for database-bound types
- Functions return typed objects with named fields, not positional tuples
- Parser functions return objects: `{ callTimeCt: Date | null; callDate: string | null }`

## Zod v4 Specifics

- `z.record()` requires two type arguments: `z.record(z.string(), z.unknown())`
- Nullable + optional fields: `z.string().nullable().optional()` (not just `.optional()` — Claude returns `null`)
- Schemas named `BodySchema` inside route files (not exported)
- Shared enums defined in `src/lib/api/schemas.ts` and imported into routes

## Supabase Query Patterns

- `.upsert(..., { onConflict: 'column_name' })` for idempotent ingestion
- `.select('id').single()` chained to get back the inserted/upserted ID
- Type cast via `(data as { id: string }).id` — the generated types in `src/lib/supabase/types.ts` are stubs
- Join results handled defensively: `Array.isArray(agents) ? agents[0]?.display_name : agents?.display_name` because Supabase may return object or array depending on FK detection

---

*Convention analysis: 2026-06-03*
