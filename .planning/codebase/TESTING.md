# Testing Patterns

**Analysis Date:** 2026-06-03

## Test Framework

**Runner:**
- Jest 30.x
- Config: `jest.config.ts` (root)
- Preset: `ts-jest`
- Test environment: `node`

**Assertion Library:**
- Jest built-in (`expect`, `toBe`, `toBeNull`, `toBeCloseTo`, `toContain`, `toBeDefined`)

**Run Commands:**
```bash
npm test              # Run all tests once
# No watch mode script defined — run jest --watch manually if needed
# No coverage script defined — run jest --coverage manually if needed
```

## Test File Organization

**Location:** Co-located with source files in the same directory

**Naming:** `[source-file].test.ts` (TypeScript only, no `.tsx` test files present)

**Current test files:**
- `src/lib/parsers/call-metadata.test.ts` — 31 tests for parser functions
- `src/lib/audit-scoring.test.ts` — tests for scoring computation logic
- `src/lib/audit-prompt.test.ts` — tests for prompt builder output

**Module alias mapping:**
- `^@/(.*)$` → `<rootDir>/src/$1` (matches `tsconfig.json` paths)

## Test Structure

**Suite Organization:**
```typescript
// One describe block per exported function
describe('functionName', () => {
  it('describes the specific behavior being tested', () => {
    // Single assertion or tightly related assertions
  })
})
```

**Example from `src/lib/parsers/call-metadata.test.ts`:**
```typescript
describe('parseTermId', () => {
  it('converts CDT (UTC-5) to UTC — May date', () => {
    const { callTimeCt, callDate } = parseTermId('20260520201158012345abc')
    expect(callTimeCt?.toISOString()).toBe('2026-05-21T01:11:58.000Z')
    expect(callDate).toBe('2026-05-20')
  })

  it('returns null for input shorter than 14 chars', () => {
    const { callTimeCt, callDate } = parseTermId('2026052')
    expect(callTimeCt).toBeNull()
    expect(callDate).toBeNull()
  })
})
```

**Patterns:**
- No `beforeEach` / `afterEach` setup — tests are self-contained
- Shared fixtures defined as `const` at describe-block scope (e.g., `baseRow` in `buildCallRecord` suite)
- Edge cases always tested alongside happy path: empty string, undefined inputs, null inputs, boundary values

## Mocking

**Framework:** None — no Jest mocks in any test file

**Approach:** Pure function testing only. All tested functions are:
- Deterministic (same input → same output)
- Side-effect free (no DB, no HTTP, no filesystem)
- Imported directly from source

**What is NOT tested (and therefore not mocked):**
- Supabase calls (`src/lib/data/*.ts`, API route handlers)
- Anthropic API calls (`src/app/api/audit/run/route.ts`)
- Next.js server internals (`cookies()`, `NextResponse`)
- React components (no component tests exist)

## Fixtures and Test Data

**Test Data:** Inline literals — no fixture files or factory functions

**Pattern for complex input:**
```typescript
// Define shared base object at describe scope, destructure to override
const baseRow = {
  orig_id: 'orig-abc',
  call_id: '20260520201158012345abc',
  from_name: 'John Smith',
  from_number: '3195551234',
  dialed_number: '5155559000',
  to_extension: '101',
  duration_seconds: 155,
  filename: 'aud-20260519200459047604-abc-xyz.wav',
}

it('handles a row with no filename', () => {
  const { filename: _, ...rowWithoutFile } = baseRow
  const result = buildCallRecord(rowWithoutFile)
  expect(result.original_filename).toBeNull()
})
```

**Array fixture pattern:**
```typescript
const allYes: CriterionResult[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  flag: 'Yes' as const,
  evidence: 'test',
}))
```

## Coverage

**Requirements:** None enforced (no coverage thresholds in `jest.config.ts`)

**View Coverage:**
```bash
npx jest --coverage
```

**Current coverage scope:** Only pure utility and parsing functions. No API routes, data layer, or UI components are covered by automated tests.

## Test Types

**Unit Tests:**
- All current tests are unit tests
- Scope: exported functions in `src/lib/parsers/` and `src/lib/`
- No external dependencies, no mocking required

**Integration Tests:**
- Not present. API routes are tested manually via n8n or curl.

**E2E Tests:**
- Not present. No Playwright or Cypress configuration.

**Component Tests:**
- Not present. No React Testing Library setup.

## Common Patterns

**Testing null/boundary handling:**
```typescript
it('returns null for empty string', () => {
  expect(normalizePhoneNumber('')).toBeNull()
})

it('returns unknown for undefined inputs', () => {
  expect(inferDirection(undefined, undefined, undefined)).toBe('unknown')
})
```

**Testing floating point:**
```typescript
// Use toBeCloseTo for percentage calculations
expect(result.score_pct).toBeCloseTo(50)
expect(enthusiasm!.score_pct).toBeCloseTo(66.67, 1)
```

**Testing string output contains expected content:**
```typescript
// For prompt builders — assert key strings are present
it('includes the supportive-manager framing', () => {
  const prompt = buildScoringPrompt({ ... })
  expect(prompt).toContain('supportive manager')
  expect(prompt).toContain('GA')
})

// For completeness checks — loop over expected values
it('includes all 30 criterion ids', () => {
  for (let i = 1; i <= 30; i++) {
    expect(prompt).toContain(`"id": ${i}`)
  }
})
```

**Testing aggregate structures:**
```typescript
// Use .find() on arrays then assert the found item
const enthusiasm = result.section_scores.find(s => s.section === 'Enthusiasm')
expect(enthusiasm).toBeDefined()
expect(enthusiasm!.score_pct).toBeCloseTo(66.67, 1)
```

## What to Test (Guidelines from Observed Pattern)

**Test these:**
- Pure parsing functions that transform input to output
- Edge cases: empty string, null, undefined, boundary lengths, invalid formats
- Business logic computations: score calculations, aggregations, normalizations
- Prompt builders: key strings present, complete enumeration of required elements

**Do NOT write tests for:**
- Next.js App Router pages or layouts
- Supabase client wrappers (`src/lib/supabase/`)
- API route handlers (they depend on `server-only`, `NextResponse`, and live DB)
- React components (no test renderer configured)

---

*Testing analysis: 2026-06-03*
