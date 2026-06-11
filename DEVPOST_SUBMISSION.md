# VarFoot Devpost Submission Copy

## Project Name

VarFoot

## Tagline

The varsity-readiness coach for high-school soccer players who are training alone and need a real plan.

## Who We Built It For

We built VarFoot for Jordan Reyes, a 16-year-old JV midfielder who wants to make varsity next season.

Jordan is not lazy. Jordan already trains after school. The problem is that training alone is mostly guessing. One day it is YouTube dribbling drills. Another day it is pushups. Sometimes it is a coach's old PDF. None of it answers the question Jordan actually cares about:

**Am I getting closer to varsity, and what should I work on first?**

That uncertainty is the real problem. A high-school player can care deeply and still waste weeks on the wrong work because they do not have a baseline, benchmarks, feedback, or a plan.

## Project Description

VarFoot turns varsity tryout prep into a measurable, personal training system.

The player starts with a soccer-specific baseline assessment: passing, first touch, weak foot, speed, defending, strength, sleep, hydration, and fueling. VarFoot converts those results into a **Varsity Readiness score** using freshman, JV, and varsity anchors. Then it shows the player's biggest gaps and generates a training roadmap toward the tryout date.

For Jordan, the app does not just say "train more." It shows that Jordan is around JV level, strongest technically, but held back by speed/agility and a few specific drills. The next session is built from those actual gaps. When Jordan logs a session, the roadmap updates.

VarFoot also includes a Fuel tab backed by USDA FoodData Central search, plus a Gemini-powered coach that answers with Jordan's real readiness score, gaps, roadmap, and nutrition log. The coach is intentionally grounded and safety-conscious: nutrition targets are estimates, not medical prescriptions, and the app frames fueling around balanced meals, snacks, hydration, and support from adults or clinicians when needed.

## What Makes It Interesting

Most training apps are generic. Most AI coach demos are generic. VarFoot is specific.

- It is built around the language of high-school soccer: freshman, JV, varsity, tryouts, sessions, gaps.
- The roadmap is generated from measured weaknesses, not from a canned calendar.
- The coach sees the same state the player sees: score, gaps, next session, meals, and tryout deadline.
- The demo persona is not a mascot. Jordan has a coherent athletic profile, a real problem, and a plan that changes after training.

The emotional goal is simple: a player should leave the app feeling less lost.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth and PostgreSQL sync
- Gemini 3.1 Flash Lite for AI coach and roadmap summaries
- USDA FoodData Central API for nutrition search
- Vitest for scoring and roadmap regression tests
- Vercel deployment

## Demo Script

1. Open the app and click **Explore demo athlete**.
2. Introduce Jordan: JV midfielder, trying to make varsity.
3. Show Today: readiness score, top gap, and next session.
4. Open the roadmap: the plan is built from Jordan's actual weakest areas and tryout date.
5. Open Progress: radar, history, and weakest-first gaps.
6. Open Fuel: USDA-backed food search and macro totals.
7. Ask Coach: "What should Jordan work on first?"
8. Close by showing that this is not a generic chatbot. It is a personal tryout-prep system built around one athlete's real data.

## Live Link

[https://varfoot.vercel.app](https://varfoot.vercel.app)

## Demo Video

Upload `demo/varfoot-demo-2min.mp4` to YouTube or Vimeo with embedding enabled, then paste the hosted URL into Devpost.

## Repository

Paste the public GitHub repository URL here before final submission.
