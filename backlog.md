# VarFoot Backlog

Items deferred from the pre-submission rubric audit. Not blocking launch but worth addressing before or immediately after the hackathon.

---

## P18 — Record a demo video (backup for live presentation)

**Why:** Live demos fail. Network issues, Gemini rate limits, Supabase cold starts — any of these can freeze the demo during judging. A pre-recorded fallback protects the presentation.

**What to record (90 seconds):**
1. Auth screen → click "Explore demo" (0:00–0:05)
2. Today tab — show score ring (70/100 JV), streak, tiles, biggest gap (0:05–0:25)
3. Tap a session to open it → log one drill result → session complete modal appears (0:25–0:50)
4. Fuel tab — show macros logged, ring progress (0:50–1:05)
5. Coach tab — ask "What should I work on first?" → see streaming response (1:05–1:25)

**Tool suggestion:** QuickTime screen recording on Mac, or Loom for easy sharing.

---

## P19 — Write the personal story for Devpost

**Why:** The hackathon theme is "Build for Someone Real." A feature-list description scores lower than a personal narrative. Judges weight the story heavily.

**Draft opening (adapt freely):**

> I played JV soccer and had no real training plan. I could find skill drill PDFs online but had no idea whether my numbers were any good, what to prioritize first, or how to track whether I was improving.
>
> VarFoot is what I wished I'd had: a 19-drill baseline assessment that maps you to real freshman/JV/varsity benchmarks, an AI-generated roadmap prioritized around your actual gaps, a grounded AI coach that answers with your real data — not canned advice — and a nutrition tracker connected to the USDA food database.
>
> It's built for the player who wants to make varsity and just needs a plan.

**After the story, list features.** Don't lead with features.

---

## Minor / Out-of-scope

- **Nutrition targets for female athletes** — currently uses male Mifflin-St Jeor as default. Add a biological-sex field to the onboarding BodySlide to switch the equation. Deferred because no sex field is collected today.
- **Coach message persistence across sessions** — coach messages currently stored in AppState and synced to Supabase, but a very long conversation could grow AppState significantly. Consider truncating to last 50 messages on save.
- **Streak date validation** — streak currently counts consecutive completed roadmap nodes, not actual calendar days. A future improvement would compare `node.date` to calendar days to detect missed sessions.
