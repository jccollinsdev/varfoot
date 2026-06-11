# VarFoot — Devpost Submission Copy

## Project Name

VarFoot

## Tagline

A personalized AI soccer roadmap for athletes trying to make varsity.

## Who I Built It For

I built VarFoot for myself.

My name is Sansar Karki. I'm an incoming freshman trying to make varsity soccer, and I've been documenting the whole journey publicly on Instagram at [@sansar.mp4](https://www.instagram.com/sansar.mp4/) (1,100+ followers). Training clips, summer maxing, the grind — it's all out there.

But here's the honest part: I had the motivation, the clips, and the public accountability, and I still didn't have a real plan. I was training hard without knowing exactly what to work on, how to structure a session, how to connect my weaknesses to specific drills, or how to tell whether any of it was actually moving me toward making the team at tryouts.

The problem was never effort. The problem was the lack of a system. VarFoot is the system I wished I had.

## The Problem

A motivated high-school player can do everything "right" and still drift:

- **Generic YouTube drills** aren't personalized — they don't know my position, my weaknesses, or my tryout date.
- **Fitness apps** track workouts but don't understand soccer or what varsity actually demands.
- **Coaches** give team-level feedback, not a daily, individual plan, and they're not available every day.
- **Nutrition apps** aren't built around a teenage athlete's needs or soccer-specific goals.

So the real question — *"What exactly should I work on today to become varsity-ready?"* — goes unanswered. That uncertainty is what wastes months.

## What VarFoot Does

VarFoot turns a vague goal ("make varsity") into a concrete, measurable daily plan.

1. **Assessment** — a soccer-specific baseline across technical skill, physical readiness, speed/stamina, recovery, and fueling (solo-doable drills, so I can actually test myself).
2. **Weakness diagnosis** — every drill is scored against freshman / JV / varsity anchors and ranked weakest-first, so I see what's actually holding me back.
3. **Varsity Readiness score** — a single 0–100 number (40 = freshman, 70 = JV, 100 = varsity-ready) with a per-category breakdown and a skill radar.
4. **Personalized roadmap** — a deterministic plan built from my real gaps and my tryout date, not a canned calendar. Completing a session regenerates the rest of the plan from where I actually am.
5. **Daily training sessions** — each session is built from my prioritized gaps, with drill-by-drill guidance.
6. **Fuel support** — a nutrition tab backed by the USDA FoodData Central API for real macro math, with teen-athlete-safe framing.
7. **AI coach** — a Gemini-powered coach grounded in my actual readiness score, gaps, today's session, and food log — so it answers *me*, not a generic player.

## Why It Matters

Before VarFoot: random training, unclear priorities, no way to know if the work matched the varsity goal.

After VarFoot: a weakness-ranked roadmap, daily sessions tied to specific drills, progress tracking against tryouts, fuel guidance, and a coach-like assistant that always knows what I should do next.

It was built for one real person with a real, public goal — which is exactly why it can help thousands of athletes who have the same goal and no plan.

## What Makes It Real, Not Generic

- It speaks the language of high-school soccer: freshman, JV, varsity, tryouts, sessions, gaps.
- The roadmap is generated from *measured* weaknesses, not a fixed template.
- The AI coach sees the same state I see: score, gaps, next session, meals, and tryout deadline.
- It was built by the athlete it's for, against a documented public journey ([@sansar.mp4](https://www.instagram.com/sansar.mp4/)).

## Safety Note (Teen Nutrition)

VarFoot is careful because the user is a minor. Nutrition targets are framed as **planning estimates, not medical prescriptions**: protein uses a conservative youth-athlete reference (~1.5 g/kg/day), calories use a sex-neutral Mifflin–St Jeor midpoint, and the AI coach is instructed to point toward balanced meals, hydration, and support from parents/coaches/clinicians rather than commanding exact numbers.

## Tech Stack

- Next.js 16 (App Router, Turbopack) — installed as a PWA
- React 19 + TypeScript (strict)
- Supabase (auth + PostgreSQL with row-level security, for cross-device sync)
- Gemini 3.1 Flash Lite (streaming AI coach + roadmap summaries)
- USDA FoodData Central API (real nutrition data)
- Deterministic scoring + roadmap engine (unit-tested)
- 50-drill catalog with diagrams
- Vitest test suite
- Deployed on Vercel

## Demo Script

1. Open the app and click **Explore demo athlete** — it loads my profile: Sansar Karki, incoming freshman chasing varsity.
2. **Today:** readiness score, biggest gap, and the next session.
3. **Plan:** the roadmap, built from my weakest areas and my tryout date.
4. **Train:** open a session and a drill to show the guidance.
5. **Progress:** score trend, skill radar, and weakest-first gaps.
6. **Fuel:** USDA-backed food search and macro totals, with the safety framing.
7. **Coach:** ask "What should I work on first?" and show the answer is grounded in my real data.
8. Close: this isn't a generic chatbot or tracker — it's a personal tryout-prep system built by the athlete it's for.

## Presentation Narrative (one line)

"I built VarFoot for myself because I'm an incoming freshman trying to make varsity. I had motivation, training clips, and a public journey — but no actual system. VarFoot gives someone like me a personalized roadmap, daily sessions, drill guidance, fuel tracking, and an AI coach, so the goal finally becomes actionable."

## Built By

VarFoot was built by two 8th-grade athletes from Andover, MA:

- **Sansar Karki** (Doherty Middle School) — the soccer player VarFoot is built for. Trying to make varsity as a freshman, builds apps, and is into AI and robotics. Documents the journey at [@sansar.mp4](https://www.instagram.com/sansar.mp4/) (1,100+ followers).
- **Saaransh Jinna** (Wood Hill Middle School) — training to make the AHS tennis team; into robotics and math. Brings the same athlete-chasing-a-spot perspective to how VarFoot is designed.

Two athletes who know the feeling of working hard with no clear path — so we built the path.

## Live Link

[https://varfoot.vercel.app](https://varfoot.vercel.app)

## Demo Video

Upload `demo/varfoot-demo-2min.mp4` to YouTube or Vimeo with embedding enabled, then paste the hosted URL into Devpost.

## Repository

Paste the public GitHub repository URL here before final submission.
