# VarFoot

A personalized AI soccer roadmap for athletes trying to make varsity. Built for LexHack '26 (theme: "Build something real for someone").

VarFoot is built by **Sansar Karki & Saaransh Jinna**, two 8th-grade athletes from Andover, MA — and it's built for one of us. Sansar is an incoming freshman trying to make varsity soccer, documenting the journey publicly at [@sansar.mp4](https://www.instagram.com/sansar.mp4/). He had the motivation and the training clips but no real system: no clear way to identify weaknesses, turn them into daily sessions, connect them to drills, fuel correctly, or track progress toward tryouts. VarFoot is that system.

**Live app:** [varfoot.vercel.app](https://varfoot.vercel.app) — click **Explore demo athlete** on the auth screen to open the app pre-loaded with my profile (incoming freshman chasing varsity), or sign up and go through the real assessment.

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

- `DEVPOST_SUBMISSION.md` — Devpost-ready story, tagline, stack, demo script (centered on Sansar Karki, the real user)
- `SUBMISSION_REPORT.md` — clinical rubric audit and 90% readiness call
- `demo/varfoot-lexhack-pitch.pptx` — editable 10-slide live presentation deck (Sansar story)
- `demo/varfoot-demo-2min.mp4` — narrated walkthrough for Devpost upload

Regenerate the local assets (dev server must be running for screenshots):

```bash
node scripts/capture_screenshots.mjs   # refresh public/screenshots from the demo athlete
node scripts/build_pitch_deck.mjs      # rebuild demo/varfoot-lexhack-pitch.pptx
python3 scripts/build_demo_video.py    # rebuild the demo video (optional)
```

> Note: the pitch deck embeds `public/screenshots/*.png`, so recapture screenshots before rebuilding the deck whenever the app UI or demo profile changes.

## Docs

- `docs/scoring-model.md` — how the 0–100 readiness score is computed
- `docs/benchmark-assumptions.md` — varsity/JV/freshman benchmark sources
- `docs/drill-asset-manifest.md` — drill diagram inventory
