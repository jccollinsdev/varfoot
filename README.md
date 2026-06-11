# VarFoot

VarFoot is a soccer-specific PWA for JV, freshman, and club players who want a clearer roadmap to varsity. Built for LexHack '26 (theme: "Build for Someone Real").

**Live app:** [varfoot.vercel.app](https://varfoot.vercel.app) — click **Explore as Jordan Reyes** on the auth screen for the full experience without an account, or sign up and go through the real 19-drill assessment.

## What it does

- **Onboarding assessment** — 19-drill skill + physical baseline across all five soccer competency pillars (solo-doable drills only; partner drills available in the training library)
- **Varsity Readiness score** — weighted composite (40 = freshman, 70 = JV, 100 = varsity-ready) with per-category breakdown and radar chart
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
| `GEMINI_API_KEY` | Google Gemini API key |
| `USDA_API_KEY` | FoodData Central key (falls back to public DEMO_KEY) |

The app runs fully in demo/local mode without any keys — auth, Supabase, and Gemini are skipped gracefully.

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## LexHack submission assets

- `DEVPOST_SUBMISSION.md` — Devpost-ready story, tagline, stack, demo script, and hosted-video reminder
- `SUBMISSION_REPORT.md` — clinical rubric audit and 90% readiness call
- `demo/varfoot-demo-2min.mp4` — 2:08 narrated walkthrough for Devpost upload
- `demo/varfoot-lexhack-pitch.pptx` — editable 9-slide live presentation deck

Regenerate the local assets with:

```bash
python3 scripts/build_demo_video.py
/Users/sansarkarki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build_pitch_deck.mjs
```

## Docs

- `docs/scoring-model.md` — how the 0–100 readiness score is computed
- `docs/benchmark-assumptions.md` — varsity/JV/freshman benchmark sources
- `docs/drill-asset-manifest.md` — drill diagram inventory
