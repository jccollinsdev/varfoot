# VarFoot — Deep Code & Product Audit

**Audited:** 2026-06-08 · **Auditor:** senior-engineer pass over the full codebase
**Scope:** every file in `src/`, the Supabase migration, the service worker, build/lint/typecheck, docs, README, and the existing `SUBMISSION_REPORT.md`.

This document is the companion to `SUBMISSION_REPORT.md`. The submission report is the *narrative*; this is the *defect + opportunity ledger*. Each item has a severity, the evidence (file:line), the impact on judging, and a concrete fix. The last section is a prioritized plan that maps fixes to rubric points.

---

## TL;DR — what to fix, in order

| # | Item | Sev | Rubric lever | Effort |
|---|------|-----|--------------|--------|
| 1 | **README tells judges to click a "Try demo" button that no longer exists** | 🔴 Critical | Presentation | 5 min |
| 2 | **Service worker is cache-first on the HTML doc → judges get a stale app after any redeploy** | 🔴 Critical | Technical / Presentation | 30 min |
| 3 | **No pre-onboarding demo path — judges must complete 22 steps (incl. real soccer drills they can't do) before seeing anything** | 🔴 Critical | Impact | 1–2 hr |
| 4 | **SSE stream parsing doesn't buffer partial frames → coach answers can silently drop characters** | 🟠 High | Technical | 30 min |
| 5 | **Radar is inconsistent across screens (Readiness = 5 axes incl. "Plan", Progress = 4) and Progress is mislabeled "Five-category radar"** | 🟠 High | Design | 20 min |
| 6 | **No progress-over-time trend (the single most emotionally resonant training-app feature is absent)** | 🟠 High | Impact / Design | 2–4 hr |
| 7 | **Session-complete modal shows absolute score, not the Δ delta** | 🟡 Medium | Design / Impact | 30 min |
| 8 | **USDA falls back to rate-limited DEMO_KEY; Gemini/Supabase have no rate limiting** | 🟡 Medium | Presentation reliability | 30 min–1 hr |
| 9 | **Zero automated tests on the core scoring/roadmap engine — the differentiator is unverified** | 🟡 Medium | Technical | 1–2 hr |
| 10 | Dead code, stale comments, README scoring numbers wrong, unused secret | 🟢 Low | Polish | 30 min |

Build/typecheck/lint status is **green** (0 type errors, 0 lint errors, 3 unused-var warnings, production build succeeds in ~2.4s). The foundation is solid; the issues below are about robustness, judge experience, and consistency — not a broken app.

---

## 1. 🔴 Critical — Presentation & live-demo risk

### 1.1 README points judges to a removed button
- **Evidence:** `README.md:5` — *"click **Try demo** on the auth screen for the full experience without an account"* and `README.md:9` ("19-step"). `backlog.md:13` references *"Explore demo"/"Try demo"* on auth. But `Auth.tsx` has **no demo button** — the last commit (`6c07c82`, "remove demo from Auth") deleted it. The only demo entry point is now **"Load demo athlete" inside the Profile sheet** (`Profile.tsx:64`), which is **unreachable until onboarding is complete** (gated at `page.tsx:589`).
- **Impact:** A judge who reads the README/Devpost and lands on the live URL looks for a "Try demo" button that isn't there, then has to either create an account or grind through onboarding. First impression = "the instructions are wrong." This is the cheapest high-value fix in the whole repo.
- **Fix:** Decide the product story and make all three surfaces agree (README, backlog, Auth UI):
  - **Option A (recommended):** Re-add an "Explore with sample data" button on `Auth.tsx` that calls `loadDemo()` (the handler already exists at `page.tsx:540`). Judges get the populated Jordan Reyes state in one click. Keep real sign-up as the primary CTA.
  - **Option B:** Update README + backlog to describe the *actual* path ("Create a free account → onboarding → score reveal"). Cheaper but doesn't fix the judge-friction problem (see 1.3).

### 1.2 Service worker serves a stale app after every redeploy
- **Evidence:** `public/sw.js:1-2` precaches `["/", ...]`; `:21-31` the `fetch` handler is **cache-first** (`caches.match` → return cached → else network). The cache name `varfoot-v1` (`:1`) is static and the `activate` handler only deletes caches whose key ≠ `varfoot-v1` (`:9-14`).
- **Why this bites at a hackathon:** You will keep deploying up to the deadline. The moment anyone (a judge, a teammate, you on your phone) loads the site once, the SW caches the root HTML *and* the hashed JS chunks. On your next deploy the cache name is still `varfoot-v1`, so `activate` never clears it, and `fetch` keeps returning the **old `/` document forever**. The old HTML references old chunk URLs (also cached), so the app keeps working — but shows the **pre-fix build**. Judges who previewed an earlier version may never see your final polish.
- **Fix (network-first for navigations, cache-first for static assets):**
  ```js
  // public/sw.js
  const CACHE = "varfoot-v2"; // bump on every meaningful deploy
  self.addEventListener("fetch", (e) => {
    if (e.request.method !== "GET") return;
    const url = new URL(e.request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api/")) return;
    // Network-first for navigations / HTML so a redeploy is seen immediately.
    if (e.request.mode === "navigate") {
      e.respondWith(fetch(e.request).catch(() => caches.match("/")));
      return;
    }
    // Cache-first is fine for content-hashed static assets.
    e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request).then((res) => {
      if (res && res.status === 200 && res.type === "basic") {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return res;
    })));
  });
  ```
  Minimum viable version if you don't want to touch logic: **bump `CACHE` to `varfoot-v2`** before final deploy so the `activate` cleanup wipes the old cache once.

### 1.3 The judge path is 22 steps of drills a judge physically cannot perform
- **Evidence:** `Onboarding.tsx:81-89` builds `STEPS` = 3 profile + 3 physical + 3 recovery + 13 technical + 1 done = **23 screens**. Of those, 19 are *measured drills* (`Onboarding.tsx:91`) — wall passes, a 25-yd recovery sprint, max pushups, a 5-minute plank target, etc. A judge at a laptop can't do any of them, so they either (a) enter fake numbers, (b) tap "Skip this drill for now" 19 times → land on a **0/100, "below-freshman", empty** app, or (c) bail mid-wizard.
- **Impact:** This is the report's own #1 acknowledged risk ("19-step onboarding is still long"), and removing the Auth demo (1.1) made it *worse* — there's now no escape hatch. The "aha moment" score-reveal `DoneSlide` (`Onboarding.tsx:521`) only lands if the judge entered believable numbers, which they have no basis to do.
- **Fix (pick one, in priority order):**
  1. **Re-add a demo entry on Auth (same as 1.1 Option A).** Highest ROI — lets a judge see the *finished* product in one click, then optionally try onboarding.
  2. **Add a "Fill with sample athlete" shortcut on the first onboarding slide** that pre-populates `drafts` with JV-level values so the judge can click straight through to the score reveal and feel the payoff.
  3. **Pre-seed each drill's stepper with its JV target** instead of 0, so "Continue" is one tap and the resulting score is a believable JV picture rather than 0.
- **Note:** This is the biggest *Impact* lever in the audit. "Build for Someone Real" is best demonstrated by letting the judge *experience the payoff*, then explaining the real onboarding — not by forcing them through a wizard they can't complete honestly.

---

## 2. 🟠 High — Correctness & consistency

### 2.1 SSE parsing drops characters on frame boundaries
- **Evidence:** `page.tsx:420-439` (`runCoachRequest`). Each `reader.read()` chunk is decoded and split on `"\n\n"`; lines not starting with `data: ` or failing `JSON.parse` are silently ignored (`:436` `catch { /* ignore partial lines */ }`). There is **no leftover buffer carried between reads** — if a `data: {...}\n\n` frame is split across two network reads (common under real latency), the first half won't parse and the second half won't start with `data: `, so **that chunk's text is lost** from `accumulated`, which becomes the final stored message (`:446-448`).
- **Impact:** The headline "streams character-by-character" feature can occasionally render a coach answer with a missing word/sentence — exactly the kind of glitch a judge notices on a live demo. Low frequency, high visibility.
- **Fix:** Keep a running buffer and only split off complete frames:
  ```js
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";          // keep the incomplete tail
    for (const frame of frames) {
      if (!frame.startsWith("data: ")) continue;
      const payload = frame.slice(6).trim();
      if (payload === "[DONE]") { /* finish */ }
      // ... JSON.parse(payload)
    }
  }
  ```

### 2.2 The radar chart is two different charts on two screens
- **Evidence:**
  - `Readiness.tsx:43-45` builds the radar from **all** `summary.categories` → **5 axes** including **"Plan"** (planReadiness), and the card is labeled *"Five-category breakdown"* (`:67`). Internally consistent.
  - `Progress.tsx:89-94` **filters out** `planReadiness` → **4 axes**, but the card is still labeled **"Five-category radar"** (`Progress.tsx:101`). **Mislabeled.**
- **Impact:** Two problems. (a) `Progress.tsx` literally says "Five-category" above a four-axis chart — a visible factual error. (b) The Readiness screen (the post-onboarding aha moment) shows a **"Plan" axis sitting at ~70 before any plan exists** (planReadiness scores 40 for a tryout date + 30 for ≥3 training days even with zero roadmap — `readiness.ts:73-80`), which contradicts the report's own design decision that "Plan as a radar axis confuses players." The two screens should agree.
- **Fix:** Pick one model and apply it to both. Recommended: **drop planReadiness from both radars** (it's admin completion, not a skill — same rationale already used for strongest/weakest at `readiness.ts:128-129`), and fix the `Progress.tsx:101` label to **"Four-category radar"** (or just "Skill radar"). Update `Readiness.tsx:67` label to match.

### 2.3 No progress-over-time trajectory
- **Evidence:** Nothing in `AppState` (`varfoot.ts:133-160`) stores historical readiness snapshots. `Progress.tsx` and `Readiness.tsx` render *current* state only. Drill results are overwritten in place (`page.tsx:469-473` replaces `drillResults[drillId]`).
- **Impact:** The report flags this twice as a ceiling risk for Impact *and* Design. "You're +4 since last week" is the emotional core of every training app and it's absent.
- **Fix (scoped for a hackathon):** Append a lightweight snapshot on each session-complete:
  ```ts
  // in AppState
  history: Array<{ date: string; overall: number; categories: Record<string, number> }>;
  ```
  Push `{ date: localTodayIso(), overall, categories }` inside the `sessionCompleted` branch of `saveDrillResult` (`page.tsx:488-497`), then draw a simple SVG sparkline on Progress (you already have the `Ring`/`Radar` SVG primitives in `ui.tsx` to model it on). Even 3–4 points makes the line feel real. Remember to add it to `appStateSchema` (`varfoot.ts:362`) and the Supabase JSONB will carry it automatically.

---

## 3. 🟡 Medium — Robustness & technical credibility

### 3.1 Session-complete modal: show the delta, not just the score
- **Evidence:** `page.tsx:488-494` computes `newSummary` and shows `score: Math.round(newSummary.overall)`. The pre-session `summary` is available in the same closure (`page.tsx:344`).
- **Fix:** Capture `const before = Math.round(summary.overall)` before `setState`, pass `delta: after - before` into `sessionCompleteModal`, and render `+{delta}` next to the score (`page.tsx:760-763`). This is the difference between "here's a number" and "you just went up 2 points" — a real emotional beat for ~30 minutes of work. (Report explicitly lists this as a known gap.)

### 3.2 USDA DEMO_KEY + no rate limiting anywhere
- **Evidence:** `api/nutrition/search/route.ts:63` falls back to `"DEMO_KEY"` when `USDA_API_KEY` is unset. `.env.local` (local) has **no `USDA_API_KEY`**, so local dev *is* on DEMO_KEY (≈30 req/hr/IP). None of the three routes (`/api/coach`, `/api/plan`, `/api/nutrition/search`) have any throttle.
- **Impact:** (a) If `USDA_API_KEY` isn't set in Vercel, judges searching food during a demo can hit a 429/403 (`route.ts:76-79` surfaces it). (b) The public URL exposes your Gemini key's spend — anyone can spam `/api/coach`. For a public hackathon link this is a real (if low-probability) cost risk.
- **Fix:** (a) Confirm `USDA_API_KEY` is set in Vercel (already on the submission checklist — keep it there). (b) Add a tiny in-memory per-IP token bucket to the API routes (Map keyed by `request.headers.get("x-forwarded-for")`), or use Vercel's edge middleware. Even a crude "max 20 req/min/IP" closes the obvious abuse window.

### 3.3 No tests on the scoring/roadmap engine
- **Evidence:** No test runner in `package.json`; no `*.test.ts`. The crown-jewel logic — `scoreMetric` (piecewise-linear, direction-aware, `scoring.ts:44-64`), `weightedComposite` (`:108-115`), `generateRoadmap` (`roadmap.ts:121-223`) — is pure, deterministic, and *trivially testable*, yet unverified.
- **Impact:** For Technical Execution, "we wrote a real scoring model" is far more convincing with a test file proving the anchors (0/40/70/100) and the `lower_is_better` mirror math. It also guards against silent regressions while you keep editing.
- **Fix:** Add `vitest` and ~15 assertions: varsity target → 100, JV target → 70, freshman → 40, floor → 0, a `lower_is_better` sprint at each anchor, clamp at both ends, `weightedComposite` weight-sum guard, and a `generateRoadmap` snapshot (node count, no muscle-group repeat two days running, completed nodes carried over). High signal-to-effort.

### 3.4 Timezone handling is split between local and UTC
- **Evidence:** The report claims "local calendar day everywhere," and `varfoot.ts:213-222` (`localTodayIso`/`localDateOf`) + `coachContext.ts:66` do use local time. **But** `roadmap.ts` schedules entirely in **UTC** (`toIsoDate` = `toISOString().slice(0,10)`, `:59-77`), and `Today.tsx:29` compares `node.date === new Date().toISOString().slice(0,10)` (**UTC date**). For a US judge after ~5–8pm local, `toISOString()` has already rolled to tomorrow's date.
- **Impact:** The "Today's session" vs "Up next" label (`Today.tsx:27-30`) and node dates can be off by one day in the evening for any US timezone. Minor, but it undercuts the "we handle local time correctly" claim if a judge notices.
- **Fix:** Use `localTodayIso()` (already exported from `varfoot.ts`) for the comparison in `Today.tsx:29` and `coachContext.ts:59`, and consider generating roadmap dates from a local anchor. Low effort, tightens the story.

### 3.5 Sign-up "check your email" branch is a single point of failure
- **Evidence:** `page.tsx:526` — on sign-up, if `!result.data.session` it shows *"Account created! Check your email to confirm, then sign in."* This only fires if email confirmation is **on**. The whole judge flow assumes it's **off** (submission checklist item). Also note this success message renders inside the **red error banner** (`Auth.tsx:36-40`) — wrong tone/color.
- **Impact:** If the Supabase setting ever reverts (or the project gets recreated), every judge sign-up dead-ends with no session and a confirmation email they won't act on. The demo is then fully blocked.
- **Fix:** (a) Keep "disable email confirmation" on the pre-submission checklist and verify it the morning of judging. (b) Style the "account created" message as info/success, not error. (c) Belt-and-suspenders: if you adopt the Auth demo button (1.1), judges have a no-auth path regardless.

---

## 4. 🟢 Low — Polish, dead code, stale docs

- **Dead code:** `startLocalAssessment` (`page.tsx:553`) is defined but never wired to anything (lint warns). `defaultNutritionTargets` imported in `page.tsx:36` but unused. `Check` imported in `Onboarding.tsx:17` but unused. Remove all three to clear the 3 lint warnings.
- **Unused secret:** `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local`, `.env.example`, and documented in `README.md:40`, but **never referenced in `src/`** (grep is empty). A service-role key bypasses RLS; don't ship it in env if nothing uses it. Remove it from `.env.local`/example/README, or actually use it (you don't need to). Reduces blast radius if the env leaks.
- **README scoring numbers are wrong:** `README.md:10` says *"70/100 = JV, 90+ = varsity"*, but `classifyReadiness` (`scoring.ts:71-76`) only returns `varsity-ready` at **≥100** — 90–99 is still "JV". Either fix the README or (better, see below) loosen the varsity threshold.
- **"Varsity-ready" is practically unreachable:** because the composite only reads "varsity-ready" at a perfect 100 (every category averaging 100 = hitting every varsity target), realistic users top out displaying "JV" even at 95+. Consider classifying ≥90 as varsity-ready so the top of the ladder is attainable and the headline level feels earned — then the README's "90+" becomes true. Design call, but the current ceiling can feel demotivating.
- **Stale comments / labels:**
  - `varfoot.ts:89` RoadmapNode.label doc says *'e.g. "Day 4"'* but labels are now the focus category (e.g. "Passing") — `roadmap.ts:209`.
  - `varfoot.ts:177-188` `defaultNutritionTargets` doc still says "Harris-Benedict"-era 3500 kcal framing; the active path is Mifflin-St Jeor (`computeNutritionTargets`, `:195`). The `SUBMISSION_REPORT.md` table also says "Harris-Benedict" (`:171`) while the code comment says "Mifflin-St Jeor" — pick one name and use it everywhere (it's Mifflin-St Jeor).
  - `DrillCapture` timed_count branch hardcodes the label **"Clean passes completed in the window"** (`ui.tsx:316`). It's correct for the one onboarding timed_count drill (`weak-foot-wall-routine`) but wrong if any other timed_count drill (e.g. `plyo-box-jumps` "clean reps / 60s") ever reaches it. Derive the noun from `drill.unit` instead of hardcoding "passes."
- **Demo meals violate the "USDA-only, never hand-typed" invariant:** `MealIngredient` doc (`varfoot.ts:109-113`) says ingredients are *always* USDA-sourced, never seeded; the demo persona hand-codes oatmeal/banana/chicken macros (`page.tsx:141-153`). Fine for a demo, but a careful judge inspecting state would catch the contradiction — worth a one-line comment acknowledging demo data is illustrative.
- **`viewport.userScalable: false`** (`layout.tsx:38`) disables pinch-zoom — an accessibility regression (and iOS ignores it anyway). Consider removing.
- **Coach/state payload growth:** every `/api/coach` call POSTs the **entire** `AppState` including the full `coach.messages` history (`page.tsx:412`), and the autosave upserts the whole blob to Supabase on every change (`varfoot-sync.ts:52-56`). Fine at hackathon scale; truncate `coach.messages` to the last ~50 before save if you keep iterating (already in `backlog.md`).

---

## 5. What's genuinely strong (don't touch)

So the report is balanced — these are real strengths a judge should feel:

- **One scoring engine, used everywhere.** `scoreMetric` is the single source of truth feeding onboarding, readiness, gap analysis, roadmap ranking, and coach context. The piecewise-linear 0/40/70/100 anchors with a direction-aware `lower_is_better` mirror (`scoring.ts:57-63`) is a genuinely thoughtful model, documented in `docs/benchmark-assumptions.md` with every invented benchmark disclosed. This is the best part of the project.
- **Deterministic, gap-first roadmap** with muscle-group load-balancing and immutable completed-node history (`roadmap.ts`). Running it client-side for instant feedback and only using Gemini for the one-line summary (`page.tsx:367-384`) is the right call — the plan never blocks on the network.
- **Honest AI failure modes.** Coach and plan surface real errors with retry, never fake fallback copy (`gemini.ts`, `Coach.tsx:130-144`). The coach prompt is tightly grounded in real player numbers (`coachContext.ts`).
- **Schema safety end to end.** Zod validation on every API route and on every state load (local + remote), always falling back to a blank state (`varfoot.ts:260-275`, `varfoot-sync.ts:8-11`). Strict TS, zero `any`, clean build.
- **Correct RLS.** The Supabase migration scopes every row to `auth.uid()` for select/insert/update/delete on both tables (`migration:18-58`). Keys are server-side only; no secrets reach the client.
- **All 50 drill diagrams present** (verified: 50 ids, 50 PNGs, zero 404 risk) and `assessment` vs `session` provenance is modeled so a baseline measurement never makes a roadmap session look pre-completed (`varfoot.ts:77-79`).

---

## 6. Prioritized action plan (mapped to rubric)

**Do before submission (≈3–4 hours, high leverage):**
1. **[Presentation]** Fix README/backlog/Auth demo mismatch (1.1) + bump SW cache or go network-first (1.2). ~40 min, removes two "the instructions/app are broken" moments.
2. **[Impact]** Add a one-click demo/sample path that reaches the populated app *before* onboarding (1.3 / 3.1). The single biggest Impact lever.
3. **[Design]** Make the two radars consistent and fix the "Five-category" label (2.2); add the score **delta** to the session modal (3.1). ~50 min of visible polish.
4. **[Presentation]** Verify in Vercel: `USDA_API_KEY` set, `GEMINI_API_KEY` set, Supabase email-confirm **off** (3.2, 3.5). Record the 90-sec fallback video and write the Devpost story (`backlog.md` has both scripts).

**Do if time allows (raises the technical/impact ceiling):**
5. **[Impact/Design]** Progress-over-time sparkline from session snapshots (2.3). Biggest "wow" per hour after the demo path.
6. **[Technical]** SSE buffer fix (2.1) + a `vitest` file pinning the scoring anchors (3.3). Turns "we have a model" into "we have a *verified* model."
7. **[Technical]** Local-time fix in `Today.tsx`/`coachContext` (3.4); crude per-IP rate limit on the API routes (3.2).

**Cleanup (do last, 30 min):**
8. Remove dead code + unused service-role key, fix stale comments and the README scoring numbers, reconcile "Mifflin-St Jeor" naming, drop `userScalable:false` (Section 4).

---

## Appendix — verification performed

- `npx tsc --noEmit` → **0 errors**.
- `npx eslint .` → **0 errors, 3 warnings** (unused vars listed in §4).
- `npm run build` (Next 16.2.7 / Turbopack) → **success in ~2.4s**; routes: `/` static, `/api/{coach,plan,nutrition/search}` dynamic (Node runtime, no explicit `maxDuration`).
- Drill assets: 50 catalog ids ↔ 50 `public/drills/*.png` → **no missing images**.
- Env hygiene: `.env*` gitignored (`.gitignore:30-31, 41`); only `.env.example` tracked; no secrets in git. `SUPABASE_SERVICE_ROLE_KEY` present in env but unused in code.
- Drill counts: 13 `pdf` + 6 `physical-assessment` + 31 `catalog` = 50; onboarding measures 13 + 6 = 19 (matches the "19-drill assessment" claim).
</content>
</invoke>
