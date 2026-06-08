# VarFoot

VarFoot is a soccer-specific PWA for JV, freshman, and club players who want a clearer roadmap to varsity. Built for LexHack '26 (theme: "Build for Someone Real").

**Live demo:** [varfoot.vercel.app](https://varfoot.vercel.app) — click **Try demo** on the auth screen for the full experience without an account.

## What it does

- **Onboarding assessment** — 19-step skill + physical baseline across all five soccer competency pillars
- **Varsity Readiness score** — weighted composite (70/100 = JV, 90+ = varsity) with per-category breakdown and radar chart
- **Gap Analysis** — every drill ranked weakest-first, grouped by category, with varsity benchmarks
- **AI-generated roadmap** — deterministic weekly plan from your gaps + tryout date, with a Gemini-written summary
- **Session tracking** — drill-by-drill logging with progress counters; assessment baseline ≠ session log
- **USDA food database search** — real macro math from live FoodData Central API
- **AI coach chat** — Gemini 3.1 Flash Lite grounded in your actual readiness, gaps, roadmap, and nutrition log

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript
- Supabase (auth + PostgreSQL with RLS)
- Gemini 3.1 Flash Lite (AI coach + roadmap summary)
- USDA FoodData Central API (nutrition search)
- Vercel (deployment)

## Run locally

```bash
cp .env.example .env.local   # fill in your keys
npm install
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `USDA_API_KEY` | FoodData Central key (falls back to public DEMO_KEY) |

The app runs fully in demo/local mode without any keys — auth, Supabase, and Gemini are skipped gracefully.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Docs

- `docs/scoring-model.md` — how the 0–100 readiness score is computed
- `docs/benchmark-assumptions.md` — varsity/JV/freshman benchmark sources
- `docs/drill-asset-manifest.md` — drill diagram inventory
