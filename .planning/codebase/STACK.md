# Technology Stack

**Analysis Date:** 2026-06-03

## Languages

**Primary:**
- TypeScript 5.x — all application code, API routes, data layer, tests
- SQL (PostgreSQL dialect) — Supabase migrations in `supabase/migrations/`

**Secondary:**
- CSS — global styles at `src/app/globals.css` via Tailwind CSS

## Runtime

**Environment:**
- Node.js (LTS) — Next.js server runtime

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.2.7 (App Router, RSC) — full-stack framework; server components, route handlers, font loading
- React 19.2.4 — UI rendering
- React DOM 19.2.4 — DOM bindings

**Styling:**
- Tailwind CSS 4.x — utility-first CSS; configured via `src/app/globals.css` (no `tailwind.config.js` — uses CSS-based config)
- PostCSS via `@tailwindcss/postcss` — configured in `postcss.config.mjs`
- `tw-animate-css` 1.4.0 — animation utilities
- `tailwind-merge` 3.6.0 — conditional class merging; used through `src/lib/utils.ts`
- `class-variance-authority` 0.7.1 — variant-based component styling (shadcn pattern)

**Component Library:**
- shadcn/ui 4.10.0 (style: `base-nova`, RSC mode enabled) — component scaffolding tool; config at `components.json`
- `@base-ui/react` 1.5.0 — Base UI primitives (headless, accessible)
- Lucide React 1.17.0 — icon library (configured as icon library in shadcn)

**Data & State:**
- TanStack Table 8.21.3 — headless table with sorting, filtering, pagination; used in `src/app/calls/`
- Recharts 3.8.1 — chart components; used in `src/app/dashboard/`
- Zod 4.4.3 — runtime schema validation on all API route bodies

**Testing:**
- Jest 30.4.2 — test runner
- ts-jest 29.4.11 — TypeScript transformer for Jest
- `@types/jest` 30.0.0 — type definitions
- Test environment: `node` (not jsdom — pure unit tests, no DOM)

**Build/Dev:**
- Next.js dev server — `npm run dev`
- TypeScript compiler — `npm run build` triggers `next build` with type checking
- ESLint 9.x + `eslint-config-next` 16.2.7 — linting via `eslint.config.mjs`

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.106.2 — Supabase JS client for DB access
- `@supabase/ssr` 0.10.3 — SSR-compatible Supabase client with cookie session handling
- `@anthropic-ai/sdk` 0.100.1 — Anthropic Claude API client; used server-side in `src/app/api/audit/run/route.ts`
- `server-only` 0.0.1 — build-time guard preventing server modules from being imported in client components

**Infrastructure:**
- `zod` 4.4.3 — all ingest and audit API payloads validated before DB writes; note: `z.record()` requires two type args in v4

## Configuration

**TypeScript:**
- `tsconfig.json`: target ES2017, strict mode, `bundler` module resolution, path alias `@/*` → `./src/*`
- Next.js TypeScript plugin enabled

**Jest:**
- `jest.config.ts`: preset `ts-jest`, `node` test environment, `@/*` path alias mapped to `<rootDir>/src/*`
- Test match: `**/*.test.ts`, `**/*.test.tsx`

**ESLint:**
- `eslint.config.mjs` — Next.js ESLint config

**shadcn:**
- `components.json`: style `base-nova`, RSC enabled, icon library `lucide`, CSS variables enabled, aliases for `@/components`, `@/lib`, `@/hooks`

**Environment:**
- `.env.local` (not committed) — all secrets; see `.env.local.example` for required variables
- `NEXT_PUBLIC_*` vars safe for client; all others server-only

**Build:**
- `next.config.ts` — minimal Next.js config (no custom options currently set)
- PostCSS: `postcss.config.mjs` with `@tailwindcss/postcss` plugin
- Package override: `postcss >= 8.5.10` to resolve transitive version conflict

## Platform Requirements

**Development:**
- Node.js LTS
- `npm install` to install dependencies
- `.env.local` populated with all keys from `.env.local.example`
- `npm run dev` starts at `http://localhost:3000`

**Production:**
- Vercel — `https://pfitzer-pulse-app.vercel.app`
- Environment variables set in Vercel dashboard (not committed)
- `npm run build` for production build; `npm run start` to serve

---

*Stack analysis: 2026-06-03*
