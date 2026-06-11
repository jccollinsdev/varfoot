# VarFoot - LexHack '26 Clinical Submission Audit

**Hackathon:** LexHack '26  
**Theme:** Build something real for someone  
**Built for:** Sansar Karki — incoming freshman trying to make varsity soccer ([@sansar.mp4](https://www.instagram.com/sansar.mp4/), 1,100+ followers)  
**Deadline:** June 12, 2026 at 10:00 PM EDT  
**Live app:** [varfoot.vercel.app](https://varfoot.vercel.app)  
**Demo path:** click **Explore demo athlete** on the auth screen (loads Sansar's profile)  
**Stack:** Next.js 16, React 19, TypeScript, Supabase, Gemini 3.1 Flash Lite, USDA FoodData Central, Vercel

---

## Clinical Grade

**Current estimate: 88-91 / 100 if the final video is uploaded and the live deployment is current.**

This is now in prize-contending shape for LexHack because it speaks directly to the rubric: it was built by the athlete it's for. Sansar Karki is a real, named, incoming freshman with a public varsity journey ([@sansar.mp4](https://www.instagram.com/sansar.mp4/)), a concrete pain point, a working app, real data, and a demo path judges can understand in under five minutes. The remaining ceiling risk is not engineering polish; it is whether the presentation makes judges feel the human problem before they see the feature list.

| Criterion | Weight | Grade | Why |
|---|---:|---:|---|
| Impact / Usefulness | 40% | 36-38 / 40 | Strong real-person fit: the builder is the user — an incoming freshman trying to make varsity with no structured plan between practices. The app turns self-testing, planning, fueling, and coaching into one usable workflow. |
| Technical Execution | 30% | 26-28 / 30 | Real auth/sync, strict TypeScript, tested scoring/roadmap logic, deterministic gap-first planning, USDA search, streaming Gemini coach, PWA shell, and regression tests for the date bug. |
| Creativity + Design | 20% | 17-18 / 20 | The product framing is sharp: not a generic fitness tracker, but a varsity-readiness operating system. Mobile UI is polished, fast, and demoable. |
| Presentation | 10% | 9 / 10 | Demo route, story doc, and generated slide/video assets are in place. Final score depends on uploading the 2-3 minute video and rehearsing the 5-minute live flow. |

---

## What Works

### Human Problem Fit

VarFoot is built for the player who cares enough to train alone but does not know what to do next. That is a real high-school athlete problem, and it is the builder's own problem: coaches give team feedback, YouTube gives random drills, and players are left guessing which weakness is blocking them from varsity.

Sansar Karki — the builder, and the athlete the demo profile represents — makes the story concrete: an incoming freshman with a passing-first midfielder profile, a speed/agility gap, and a varsity tryout deadline, documenting the journey publicly at [@sansar.mp4](https://www.instagram.com/sansar.mp4/). The app does not say "work harder." It says what to test, what the numbers mean, what to train first, what session is next, and how fueling/recovery fit into the plan.

### Product Substance

1. **19-drill baseline** across technical skill, physical readiness, speed, recovery, and fueling.
2. **Varsity Readiness score** with freshman/JV/varsity anchors.
3. **Gap analysis** sorted weakest-first, not manually cherry-picked.
4. **Roadmap generation** from actual gaps and tryout date.
5. **Session logging** that completes roadmap nodes and updates the future plan.
6. **Progress view** with score history, radar, filters, and varsity-level badges.
7. **Nutrition tracker** using USDA FoodData Central rather than fake food rows.
8. **AI coach** streamed from Gemini and grounded in the athlete's real score, gaps, roadmap, and food log.

### Engineering Signals

- The roadmap date regression is fixed: regenerating after a completed future-dated session now continues after the latest completed session instead of rewinding to "today."
- Youth nutrition safety is tightened: protein is now based on roughly `1.5 g/kg/day`, calories use a sex-neutral Mifflin-St Jeor midpoint, and coach prompts treat nutrition targets as planning estimates rather than prescriptions.
- Focused tests cover the roadmap regression and protein target behavior.
- Core checks are intended to remain green: `typecheck`, `lint`, `test`, and `build`.

---

## Main Risks

### Impact Risk: Benchmarks Are Modeled

The app has real soccer-specific drills, but freshman/JV targets are modeled assumptions where the source material only gave varsity anchors. This is documented in `docs/benchmark-assumptions.md`. In judging, describe the model honestly: "Varsity targets are the north star; freshman/JV are calibration points so a player can understand progress."

### Safety Risk: Teen Nutrition

The app must never sound like a medical diet plan for a minor. Current mitigation:

- Targets are framed as estimates.
- Protein is capped around a youth-athlete reference point.
- The AI coach is instructed to avoid commanding exact calorie/protein targets.
- The product language points toward balanced meals, snacks, hydration, and parent/coach/clinician support.

### Presentation Risk: The Demo Can Drift

A five-minute demo can get swallowed by onboarding. Use the demo athlete for judging, then mention the full assessment exists. The live flow should be:

1. Auth screen: "I built this for myself — Sansar, an incoming freshman trying to make varsity."
2. Today: readiness score, biggest gap, next session.
3. Plan: gap-first roadmap and tryout date.
4. Train/Progress: radar and weakest-first gaps.
5. Fuel: real USDA search and macro totals, with safety framing.
6. Coach: ask "What should I work on first?"

---

## Rubric Improvements Made

| Area | Improvement |
|---|---|
| Impact | Re-centered the story and demo on the real builder/user, Sansar Karki — an incoming freshman with a public varsity journey ([@sansar.mp4](https://www.instagram.com/sansar.mp4/)) — and made the demo athlete load his profile. |
| Technical | Fixed roadmap regeneration after completed future sessions; added regression coverage. |
| Technical | Tightened nutrition target math and coach safety prompt for teen athletes. |
| Design | Made the judge demo CTA full-width and visible on auth. |
| Design | Hid horizontal scrollbars and prevented Progress filter labels from compressing. |
| Accessibility | Added auth input labels, coach input label, bottom-nav `aria-current`, nav labels, and profile dialog semantics. |
| Presentation | Added final submission copy, a 2-3 minute video target, and a slide deck deliverable. |

---

## 90% Readiness Call

VarFoot is effectively at **about 90% hackathon readiness** once the current build is deployed and the video is uploaded. The missing 10% is not another feature. It is final operating discipline:

- Verify the deployed site is the current VarFoot build, not stale VarFooty branding.
- Upload the generated 2-3 minute walkthrough to YouTube or Vimeo with embedding enabled.
- Practice the live demo until it consistently finishes in five minutes.
- Avoid over-explaining the scoring math before judges understand Sansar's problem.

If time remains, the one feature that would most improve judging emotion is a more obvious "before to after" progress story in the demo state, but the existing sparkline and session-complete delta already carry enough of that signal.
