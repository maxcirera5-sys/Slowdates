# BOND

**AI finds the connection. You decide whether to meet.**
_Fewer matches. Better connections. Real dates._

BOND is a mobile-first AI dating web app (installable PWA-style) with **no swipe** and
**no pre-date chat**. AI builds a deep compatibility profile for each user, proposes a
small number of well-matched people, explains *why* they may be compatible, and helps
both people agree a time and a venue for a real date.

> **Repo note:** the brief assumed an empty repository, but this repo already contained
> other projects, so BOND lives in its own `bond/` folder. Run everything from there.

---

## Quick start

```bash
cd bond
npm install
npm run dev
# open http://localhost:3000  → "Enter demo"
```

The app runs in **DEMO_MODE** out of the box — no Supabase, OpenAI or Google keys
required. A seeded demo profile, candidates, venues and in-progress dates are loaded
locally (persisted to `localStorage`), so you can walk the entire flow immediately.

To leave demo mode, copy `.env.example` → `.env.local` and fill in credentials.
`DEMO_MODE` auto-disables once `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (or force it with `NEXT_PUBLIC_DEMO_MODE`).

---

## Scripts & checks

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (`next lint`) |
| `npm run test` | Vitest unit tests (compatibility engine) |
| `npm run build` | Production build |
| `npm run test:e2e` | Core Playwright flow (builds + serves, demo mode) |

All of the above pass. In this sandbox the Playwright browser download is disabled, so
the e2e run points at the preinstalled Chromium:

```bash
npm run build && NEXT_PUBLIC_DEMO_MODE=true npm run start -- -p 3000 &   # in one shell
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test
```

In a normal environment just run `npx playwright install` once, then `npm run test:e2e`.

---

## Architecture

- **Next.js App Router + TypeScript (strict) + Tailwind** with a small design-system of
  primitives in `src/components/ui` (Button, Card, CompatibilityRing, CompatibilityBreakdown,
  TraitBar, PhotoCarousel, DateOptionCard, StatusBadge, EmptyState, LoadingSkeleton,
  Sheet/ConfirmationSheet, form fields, bottom navigation).
- **Provider abstractions**, each with a production adapter and a functional mock:
  - `src/lib/ai` — OpenAI (server-only) with deterministic local fallback (`deterministic.ts`).
  - `src/lib/places` — Google Places (server-only) with the local demo venue catalogue.
  - `src/lib/supabase` — browser + service-role clients, constructed only when configured.
- **Deterministic compatibility engine** (`src/lib/compatibility/engine.ts`): hard
  eligibility filters, then category scores (personality 30 / values 25 / life goals 20 /
  communication 15 / lifestyle 10). The LLM **never** produces the numeric score — it only
  writes the natural-language explanation from permitted, non-private fields.
- **Demo state** (`src/store/demo-store.ts`, Zustand + `localStorage`) is the client-side
  backbone in DEMO_MODE. Component APIs match what a Supabase-backed implementation would
  expose, so screens don't change when you wire the real backend.
- **API routes** (`src/app/api/*`) expose the server-only providers:
  `POST /api/ai-profile`, `POST /api/compatibility/explain`, `POST /api/venues`.
- **Supabase schema** in `supabase/schema.sql` (tables, enums, RLS). TypeScript domain
  types live in `src/lib/types.ts`.

### Routes
`/` · `/login` · `/onboarding[/basics|photos|preferences|questions|venues]` ·
`/app/proposals[/[id]]` · `/app/dates[/[id]]` · `/app/ai-profile` ·
`/app/profile[/edit]` · `/app/settings` · `/privacy` · `/terms` · `/safety`.
`/app/*` is guarded — visitors without a session are redirected to `/login`.

---

## Responsible AI, safety & privacy

- Minimum age **18** (enforced in onboarding validation and the DB check constraint).
- The AI profile is explicitly framed as **“a dating compatibility aid, not a psychological
  diagnosis.”** No clinical/psychometric language; a “Does this feel accurate?” control and
  regeneration (with a simple MVP rate limit) are provided.
- **No facial analysis** and no inference of attractiveness or sensitive attributes from
  photos. Physical/preference compatibility is a *declared-preference* alignment signal only.
- **Privacy:** raw questionnaire answers are never shown to other users (only summarised
  insights); post-date feedback is private; distances are approximate; exact home location is
  never exposed. Consent is requested before generating the AI profile.
- **Controls:** report, block, and a functioning “Pause discovery” toggle.

### Account deletion
Settings → *Delete account* signs the user out and clears local demo state. In production,
a full erase requires a privileged step (Supabase **service-role** key) to remove Auth +
Storage records; the admin client factory is in `src/lib/supabase/server.ts`
(`getSupabaseAdmin`) and should be called from a protected server action / route handler.

---

## Deployment

- **Vercel** for the app. Add the env vars from `.env.example` in the project settings.
- **Supabase** for Auth/Postgres/Storage: run `supabase/schema.sql`, create a public
  `photos` storage bucket, and configure Google OAuth in the dashboard if desired.
- OpenAI and Google Places keys are read **server-side only** and never shipped to the browser.

---

## Roadmap

**V1 (this MVP)**
- Deterministic compatibility engine + AI explanations, demo-mode end to end.
- No-swipe proposals, mutual-interest → inclusive scheduling → AI venue suggestion.
- Onboarding (basics, photos, preferences, 36-question quiz, favourite venues), AI profile,
  dates area, profile/settings, safety/privacy controls, unit + e2e tests.

**V2**
- Real Supabase Auth/data/storage wired through the existing provider APIs; photo uploads.
- Push/email notifications; background match generation job; proposal expiry automation.
- Google Places live venue sourcing + real map; calendar (.ics) export; premium tier billing.
- Richer feedback loop feeding future match ranking; i18n.

**V3**
- Native apps (Expo/React Native) sharing the engine and API contracts.
- Smarter re-ranking from post-date outcomes; group/event dates; verified profiles.
- Trust & safety tooling (ID verification, moderation queue), accessibility audit, analytics.
```
