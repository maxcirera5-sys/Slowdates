# BOND — Implementation Plan

> **Repository assumption.** The brief said "empty repository", but this repo already
> contains an unrelated FastAPI project (`backend/`, `frontend/`) and an abandoned
> React Native scaffold (`alma/`). To avoid deleting working code, BOND is built as a
> self-contained Next.js app in **`bond/`**. Run all commands from that directory.

## Product
BOND — AI-powered dating. No swipe, no pre-date chat. AI builds a deep compatibility
profile, proposes a few well-matched people, explains *why*, and helps agree a real date.

## Stack
Next.js (App Router) · React · TypeScript (strict) · Tailwind · shadcn-style primitives ·
Lucide · Framer Motion · Supabase (Auth/Postgres/Storage) · Zod · React Hook Form ·
TanStack Query · OpenAI (server-only) · Google Places (provider abstraction) ·
Vitest · Playwright · ESLint · Prettier.

## Key MVP decisions
- **DEMO_MODE first.** With no Supabase/OpenAI/Places credentials the whole app runs on
  realistic local mock adapters + a seeded, localStorage-backed demo store. `DEMO_MODE`
  is auto-enabled when Supabase env vars are absent. All demo data is tagged in code.
- **Provider abstraction.** `ai`, `places`, and `db` each expose an interface with a
  production adapter (Supabase/OpenAI/Places) and a functional mock adapter.
- **Deterministic compatibility.** The numeric score is computed in TypeScript
  (personality 30 / values 25 / life goals 20 / communication 15 / lifestyle 10) behind
  hard eligibility filters. The LLM only writes the natural-language explanation from
  permitted structured fields. No facial/photo inference, ever.
- **Inclusive workflow.** Proposal/scheduling roles are configurable per user, never
  hard-coded to a gendered pairing.

## Slices & checklist
- [x] 0. Scaffold: config, tooling, design tokens, install deps
- [x] 1. Types + Zod schemas + seed data (36 questions, venues, demo users)
- [x] 2. Compatibility engine + unit tests
- [x] 3. Provider abstractions (ai / places / db) + mock adapters
- [x] 4. Design primitives (Button, Card, CompatibilityRing, …)
- [x] 5. Demo store (Zustand + localStorage) + query client
- [x] 6. Landing + legal (privacy/terms/safety) + login/demo-enter
- [x] 7. Onboarding (basics, photos, preferences, questions, venues)
- [x] 8. App shell + bottom nav; Proposals list + detail
- [x] 9. Mutual interest → scheduling → venue → confirmed date; Dates area
- [x] 10. AI Profile, Profile, edit, Settings (pause/block/report/delete)
- [x] 11. Server API routes (ai-profile, explanation, venue) using adapters
- [x] 12. Checks: typecheck, lint, unit tests, production build, Playwright e2e

## Verification
`npm run typecheck && npm run lint && npm run test && npm run build` all green.
`npm run test:e2e` runs the core Playwright flow (landing → demo → proposal → interested).
