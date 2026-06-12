# VarFoot — Demo Video Reference Assets

Real, in-app screenshots of every VarFoot screen, captured from the running app
(demo athlete: **Sansar Karki**, an incoming freshman training to make varsity).
Use these as the visual ground truth when generating the 40-second product demo —
match the exact layout, colors, type, and copy shown here.

Re-generate anytime with: `node scripts/capture-screens.mjs` (dev server on :3000).
Frame: 430×900 phone, centered on black, captured @2x (Retina).

## Screens (in suggested video order)

| File | Screen | Use in video |
|------|--------|--------------|
| `01-auth.png` | Sign-up / landing | Opening hook — logo + "Train with purpose. Make varsity." + green CTA |
| `02-onboarding.png` | Onboarding step 1 (identity) | Onboarding montage |
| `03-onboarding-step2.png` | Onboarding step 2 (body & level → target: Varsity) | Onboarding montage |
| `04-today.png` | Today dashboard | Core loop — Up Next, Varsity Readiness 70, sub-scores, biggest gap, coach note |
| `05-plan.png` | Plan / roadmap | Personalized training plan |
| `06-train.png` | Train (drills + progress) | Drills section |
| `10-drill-detail.png` | Drill detail (Recovery Sprint) | Guided drill — illustration, setup, action, coaching cue, "Save result" |
| `07-coach.png` | AI Coach (empty state + prompts) | AI coaching intro |
| `13-coach-chat.png` | AI Coach (live answer) | AI coaching payoff — real grounded response |
| `08-fuel.png` | Nutrition / Fuel | Nutrition tracking — calorie ring, macro bars, logged meals |
| `09-meal-builder.png` | Meal builder | Logging a meal |
| `11-readiness.png` | Varsity readiness breakdown | Assessment beat |
| `12-gap-analysis.png` | Gap analysis | Assessment beat — biggest gaps |
| `14-profile.png` | Profile sheet | Optional — account/streak |

## Brand assets (also in this repo)

- **Logo / app mark:** `public/varfoot-mark.svg`
- **App icons:** `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`
- **Drill illustrations (line art used in drill screens):** `public/drills/*.svg`

## Brand system (from the design tokens)

- **Theme:** dark. Background `#0A0A0B`, surfaces `#1A1C1F`, borders `#2A2D33`.
- **Primary / accent (neon green):** `#39FF73` — CTAs, progress rings, active states. Button text on green: `#06140B`.
- **Secondary green:** `#18542A`.
- **Text:** primary `#F4F5F6`, muted `#9AA1A9`.
- **Fonts:** **Nunito** (rounded) for headings + body; **IBM Plex Mono** for stats/numbers/inputs.
- **Corners:** 6–8px radius. Tone: modern, athletic, energetic-but-clean.
