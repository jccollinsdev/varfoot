# VarFoot — Final Pre-Submission Audit

**Audited:** 2026-06-09
**Hackathon:** LexHack '26 — "Build for Someone Real"
**Repo:** `github.com/jccollinsdev/varfoot`
**Live (app):** `varfoot.vercel.app`
**Stack:** Next.js 16.2.7 (App Router, Turbopack) · React 19 · TypeScript (strict) · Supabase (auth + Postgres + RLS) · Gemini 3.1 Flash Lite · USDA FoodData Central · Vercel

This is a full read-through of every source file, the data model, the AI integration, the tests, and the deployment setup, scored against the four published judging criteria. The short version: this is a strong submission that will demo well. The risk is not the code. The risk is three stale documents pointing judges at the wrong URL, a missing demo video, and a "who we built it for" story that still lives in a backlog draft instead of the submission.

---

## Bottom line up front

**Health check (all run during this audit):**

| Check | Result |
|---|---|
| `npm run typecheck` | Clean, zero errors |
| `npm run lint` | 1 warning (`<img>` in landing page), 0 errors |
| `npm run test` | 33 tests passing (2 files) |
| `npm run build` | Succeeds, `/` and `/landing` both build, middleware detected |

**Estimated score: 80–86 / 100.** The engineering is already in the top tier for a high-school hackathon. What moves you from "strong" to "winning" is almost entirely presentation and framing, not more features.

| Criterion | Weight | Estimate | Weighted |
|---|---|---|---|
| Impact / Usefulness | 40% | 32–35 / 40 | 12.8–14.0 |
| Technical Execution | 30% | 26–28 / 30 | 7.8–8.4 |
| Creativity + Design | 20% | 16–18 / 20 | 3.2–3.6 |
| Presentation | 10% | 7–9 / 10 | 0.7–0.9 |
| **Total** | | | **80–86** |

The ceiling (86) assumes you record a tight demo video and write a real personal story. The floor (80) is roughly where you land if the stale URLs trip up a judge or the video is missing.

---

## What is genuinely excellent (lead with these)

These are not participation-trophy strengths. They are the things that separate this from the median submission, and you should make sure each one is visible in the demo.

1. **Real data, end to end.** Varsity targets are pulled verbatim from the source drill PDF. Nutrition macros come from live USDA FoodData Central queries (`/api/nutrition/search`), keyed on permanent USDA nutrient IDs, restricted to Foundation/SR Legacy types so the numbers are trustworthy. The AI coach is grounded in the player's actual readiness, gaps, roadmap, and today's logged meals (`coachContext.ts`). Nothing in the scored path is hand-waved.

2. **The roadmap is a real algorithm, not a template.** `generateRoadmap` ranks every drill by `100 - score`, greedily assigns the largest gaps first, rotates technical categories so you do not do passing three days straight, load-balances muscle groups across consecutive days, carries completed nodes over untouched, and respects the tryout date. This is the single most defensible "Technical Execution" story you have. A judge who asks "is this just a hardcoded schedule?" gets a satisfying answer.

3. **One scoring model, tested.** `scoreMetric` is piecewise-linear through four anchors (floor → freshman 40 → JV 70 → varsity 100), direction-aware for stopwatch drills, clamped to [0,100], with a non-finite guard. Every coach-facing number traces back to it. The 33 unit tests cover the anchor points, the clamps, the lower-is-better mirror, and the weighted composite. This is rare discipline for a hackathon.

4. **Streaming coach with memory.** SSE from `streamGemini` (AsyncGenerator) to a `ReadableStream` route to a client that parses frames incrementally and keeps the trailing partial frame buffered. Last 6 messages are sent for context. It feels alive under demo conditions instead of freezing for two seconds.

5. **Honest failure modes.** When Gemini is unavailable the app says so (`summaryError`, explicit coach error state with retry) instead of inventing fake "personalized" text. The roadmap itself is deterministic and never depends on the AI, so the core product works even if the API key is missing.

6. **Schema safety everywhere.** Zod validates every API body, every Supabase read, and every localStorage deserialization (`appStateSchema`). Corrupt state falls back to a blank state instead of crashing. RLS policies on both tables scope every row to `auth.uid()`.

7. **Graceful degradation.** No Supabase keys → local mode. No Gemini key → deterministic plan still generates, coach reports the gap. No USDA key → public DEMO_KEY fallback. The app never hard-fails on a missing dependency.

---

## Priority action plan (ranked by grade impact per hour of work)

### P0 — Do these before submitting. They are cheap and they bleed points if skipped.

**P0-1. Fix the stale live URLs in the docs. (Presentation, judge experience)**
This is the most dangerous issue in the repo and it is not code, it is documentation that will misdirect a judge.

- `README.md` should point judges straight at the app at `varfoot.vercel.app`, where the auth screen has the "Explore as Jordan Reyes" button. (Resolved: the separate marketing page was removed, so there is now a single URL and no brochure to get stuck on.)
- Same file says "the real 14-drill assessment." The onboarding measures 19 drills (13 PDF technical + 6 physical/nutrition). Use one number consistently.
- `SUBMISSION_REPORT.md` has an architecture note that says "22 steps" (it is 19 measured drills), and a changelog claiming demo was removed from Auth. Demo is currently wired into Auth (`onLoadDemo={loadDemo}` in `page.tsx`), which is good, but the doc contradicts the code.

Decide the story and make all surfaces agree: the app is `varfoot.vercel.app`, onboarding is 19 drills, demo is available both on the auth screen and in the profile sheet.

**P0-2. Record the 2–3 minute demo video. (Mandatory submission requirement + Presentation 10%)**
This is not optional. Devpost requires a 2–3 minute walkthrough on YouTube or Vimeo with embedding enabled. Without it the submission is incomplete. A recording also protects you from a live demo failing on Gemini latency or a Supabase cold start during the 5-minute Demo Day slot. The script in `backlog.md` is a good base, but update step 1: the entry point is `varfoot.vercel.app`, and you can either sign up live or click "Explore as Jordan Reyes."

**P0-3. Write the "Who you built it for" narrative for Devpost. (Impact 40%, the single biggest lever)**
The theme is "Build for someone real." Impact is 40% of the grade and it explicitly rewards "deep understanding of the user's actual needs." Right now your strongest story is a draft in `backlog.md`. The authentic Path A version (you played JV, had drill PDFs but no way to know if your numbers were good, no plan, no feedback) is genuinely compelling. Name the person, describe their situation in two or three sentences, then connect each feature back to a specific frustration that person had. Lead with the person, not the feature list. This is what takes Impact from ~32 to ~37.

### P1 — High value, low risk, doable in code today.

**P1-1. Seed a history snapshot when onboarding completes. (Impact + Creativity)**
The Progress sparkline is one of your most emotionally resonant features, and right now a real new user never sees it. `Sparkline` returns null with fewer than 2 snapshots, and nothing writes a snapshot at onboarding completion (`handleOnboardComplete` in `page.tsx` does not touch `history`). Snapshots are only created on session completion. So a judge who does the real onboarding sees an empty trend until they finish a full roadmap session, which they probably will not do in a 5-minute demo. Write one baseline snapshot at onboarding completion so the very first Progress visit shows "you are here," and the second snapshot (after one session) draws the first upward line. The demo persona already has seeded history, so this only affects real sign-ups, which is exactly the judge path.

**P1-2. Add real PNG PWA icons. (Technical + Creativity, and you advertise this feature)**
The manifest and the apple-touch-icon both point only at `varfoot-mark.svg`. iOS Safari does not reliably render SVG for home-screen icons, so a judge who follows your own "Add to Home Screen" instructions on an iPhone gets a blank or letter-boxed icon. You explicitly promote PWA install on the landing page, so a broken install icon undercuts a feature you are showing off. Add a 180×180 apple-touch-icon PNG, plus 192×192 and 512×512 maskable PNGs, and reference them in the manifest and layout metadata.

**P1-3. Clear the lint warning. (Technical polish)**
`src/app/landing/page.tsx` line 36 uses a raw `<img>` for the carousel. ESLint flags it for LCP. Either swap to `next/image` or add a scoped disable comment with a one-line reason. A clean `npm run lint` is a small but real signal of care if a judge opens the repo.

### P2 — Nice to have. Mention as "known and intentional" rather than fixing under time pressure.

**P2-1. Nutrition uses male Mifflin-St Jeor by default.** Documented in `varfoot.ts` and `backlog.md`. The honest move is to add a biological-sex toggle on the body slide, but if you do not have time, name it as a known limitation in the writeup rather than letting a judge discover it. A 2-minute fix is to relabel the targets as "estimated" so you are not claiming precision you do not have for half the population.

**P2-2. Streak counts completed roadmap nodes, not consecutive calendar days.** Documented. It means Day 1 today plus Day 2 in two weeks still reads as a 2-day streak. Low risk of a judge probing this, but if asked, the honest framing is "sessions completed in sequence," and you could relabel the UI from "day streak" to "session streak" to make the claim exactly true. That relabel is a one-word change and removes a small honesty risk.

**P2-3. Coach history could grow unbounded in saved state.** Messages are stored in `AppState` and synced to Supabase. A very long conversation grows the JSON. Truncate to the last ~50 messages on save. Not a demo risk, but a real-world one worth a line in the backlog.

---

## Criterion-by-criterion breakdown

### 1. Impact / Usefulness — 40% — estimate 32–35 / 40

**Why it scores well.** The problem is real and specific: JV, freshman, and club players have team practice and PDF drill sheets but no individual plan, no benchmark to measure against, and no feedback loop. VarFoot closes exactly that loop with a baseline assessment, a gap-ranked score, a roadmap that re-prioritizes after every session, and a coach that answers from the player's own numbers. The nutrition layer is personalized per athlete rather than a flat 3,500 kcal for everyone.

**What is capping the score.**
- The "who" is not yet front and center. Impact rewards demonstrated understanding of a real person. The fix is P0-3, not more code.
- A new user does not feel the progress payoff in a short demo because no baseline snapshot is seeded (P1-1).
- The freshman and JV benchmarks are modeled, not measured (only varsity targets come from the PDF). You document this honestly in `docs/benchmark-assumptions.md`, which is the right call, but a judge who tests their own numbers might find a benchmark that feels off. Frame the scoring as "calibrated to the source PDF's varsity standard" and own the modeled middle anchors.

### 2. Technical Execution — 30% — estimate 26–28 / 30

**Why it scores well.** Deterministic, tested scoring and roadmap engines. Real streaming AI with conversation memory and honest error states. Zod validation on every boundary. RLS on every table. Strict TypeScript with no `any` and zero typecheck errors. Network-first service worker for HTML so judges always get the latest deploy, cache-first for static assets. Server-side hostname routing via middleware so the landing/app split has no client flash. Local-day date handling so nutrition and coach context are correct for any US timezone.

**What is capping the score.**
- PWA icons are SVG-only, so the install you advertise is rough on iOS (P1-2).
- One lint warning (P1-3).
- The two documented model simplifications (sex-neutral nutrition, node-based streak). Both are defensible; just be ready to name them.

This is the criterion where you are strongest relative to the field. Make sure the demo or the writeup explicitly says "deterministic gap-first scheduler, 33 unit tests, single scoring source of truth," because a judge will not infer that from clicking around.

### 3. Creativity + Design — 20% — estimate 16–18 / 20

**Why it scores well.** The product speaks the player's actual language (freshman / JV / varsity, not beginner / intermediate / advanced). Roadmap nodes are labeled by focus ("Passing," "First Touch") instead of "Day 1." The onboarding ends on an aha moment: a score ring with your level and your strongest and weakest areas. The session-complete modal is a real emotional beat (score, point delta, streak, "plan updated"). The dark editorial aesthetic with Barlow Condensed display type, IBM Plex Mono for numbers, and a single green accent looks like a shipped product, not a hackathon UI. The new marketing landing page with the screenshot carousel is a genuinely nice touch that most teams will not have.

**What is capping the score.**
- The progress trajectory, your most "delightful" surface, is invisible to new users until they complete a session (P1-1).
- Heavy reliance on inline styles in the screen components makes the design harder to evolve, though it does not hurt the judged output.

### 4. Presentation — 10% — estimate 7–9 / 10

**Why it scores well.** Real sign-up flow, a demo shortcut for time-pressed judges, a deployed and working live link, thorough internal docs, and a clean repo.

**What is capping the score.**
- No demo video yet (P0-2). This is the biggest single point swing in this category and it is also a hard requirement.
- Stale URLs in the docs (P0-1) can actively confuse a judge during review.
- The personal story is not yet written into the submission (P0-3).

---

## File-level notes

**Architecture is clean and easy to follow.**
- `src/lib/scoring.ts` — pure scoring math, the single source of truth. No dependencies on UI or state. Correct and tested.
- `src/lib/readiness.ts` — partitions 19 measured drills across four scored buckets plus an invented "plan readiness" proxy, weighted 40/25/15/10/10. Excludes plan readiness from strongest/weakest, which is the right product call.
- `src/lib/roadmap.ts` — the gap-first scheduler. The most impressive file in the repo.
- `src/lib/varfoot.ts` — types, Zod schemas, persistence, Mifflin-St Jeor targets, local-date helpers. Well commented.
- `src/lib/coachContext.ts` — builds the grounded prompt from real state. This is why the coach feels specific.
- `src/app/api/*` — three thin, validated routes. Keys never reach the client.
- `src/app/page.tsx` (812 lines) — the app shell. Large but coherent: auth lifecycle, debounced autosave, session-completion detection, navigation stack. The session-complete path correctly recomputes readiness, captures a snapshot, and regenerates the locked portion of the roadmap.
- `src/middleware.ts` — removed along with the marketing landing page; the app now serves a single surface at `varfoot.vercel.app` with no host-based rewrite.

**Things I checked that are correct and worth knowing they are correct:**
- Demo drill results are tagged `source: "assessment"`, so opening a roadmap session in demo mode still asks the judge to log a fresh rep instead of showing the session pre-completed. Intentional and right.
- The SSE client keeps the trailing partial frame buffered, so chunked responses never drop characters mid-stream.
- `localTodayIso` / `localDateOf` use local clock components, not UTC slicing, so meal filtering is correct east of UTC.
- The service worker is network-first for navigations, which is why the earlier stale-HTML problem will not recur for judges.

---

## Pre-submission checklist

Code and deploy:
- [ ] Fix README live URL and drill count (P0-1)
- [ ] Fix SUBMISSION_REPORT live URL and "22 steps" / demo-removed claims (P0-1)
- [ ] Seed a baseline history snapshot at onboarding completion (P1-1)
- [ ] Add PNG apple-touch-icon + 192/512 maskable icons, wire into manifest + metadata (P1-2)
- [ ] Resolve the `<img>` lint warning in the landing page (P1-3)
- [ ] Confirm `GEMINI_API_KEY`, `USDA_API_KEY`, and Supabase keys are set in Vercel Production (not just Development)
- [ ] Confirm Supabase email confirmation is disabled, so sign-up drops a judge straight into onboarding
- [ ] Full end-to-end run on `varfoot.vercel.app`: sign up → onboarding → readiness reveal → generate plan → log a session → coach question → log a meal
- [ ] Test "Add to Home Screen" on a real iPhone after the icon fix

Submission (Devpost):
- [ ] Record and upload the 2–3 minute demo video, embedding enabled (P0-2)
- [ ] Write the "Who you built it for" narrative, person first (P0-3)
- [ ] Project name + one-sentence tagline
- [ ] Tech stack list
- [ ] Public GitHub link
- [ ] Live link → `varfoot.vercel.app` (the app)
- [ ] All team members listed
- [ ] Prepare the 5-minute live demo + 2-minute Q&A for Demo Day

---

## One-paragraph summary for your own reference

VarFoot is a technically strong, well-tested, real-data PWA that already clears the bar for a high-quality hackathon submission. The engine work (a tested piecewise scoring model and a real gap-first roadmap scheduler) is your differentiator and you should say so out loud, because judges will not infer it from the UI. The points you are leaving on the table are not in the code. They are a missing demo video, a personal story still sitting in a backlog file, three docs that point judges at the wrong URL, and a progress chart that new users cannot see yet. Fix those five things and you move from a solid 80 to a competitive 85-plus.
