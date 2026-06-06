# VarFoot Build Plan

## Repo state

- New Next.js App Router project created in `/Users/sansarkarki/Documents/varfoot`
- GitHub repo created at `https://github.com/jccollinsdev/varfoot`
- Local persistence and mock plan/coach generators are being added first so the app works before Supabase/Gemini secrets are wired

## Source files found

- `/Users/sansarkarki/Downloads/varfoot_prd_icp.md`
- `/Users/sansarkarki/Downloads/VarFoot_Final_Apple_Dark_Paper_All_Screens.html`
- `/Users/sansarkarki/Downloads/App for Hackathon - Google Docs.pdf`

## What the sources say

- VarFoot is a soccer-specific PWA for JV/freshman/club players trying to make varsity
- Core loop: onboarding assessment -> benchmark comparison -> Gemini week-by-week plan -> tracking -> nutrition log -> AI coach
- The handoff HTML covers 68 screen families across access, assessment, benchmark, plan, dashboard, nutrition, coach, library, account, and system states
- The PDF currently provides the physical assessment questions and goal references:
  - height/weight
  - pushups
  - plank
  - wall sit

## Implementation phases

1. Scaffold app shell, typography, and dark paper design language
2. Build the onboarding assessment, benchmark comparison, and plan generator
3. Add dashboard tracking, nutrition logging, drill library, and coach chat
4. Wire local persistence plus Supabase/Gemini integration points
5. Polish mobile responsiveness, PWA metadata, and demo-readiness

## Risks / blockers

- No Supabase or Gemini environment variables are configured yet
- The PDF source currently only contains the physical assessment section, so technical drill targets are derived from the PRD and handoff HTML
- The app must stay usable without external secrets, so every networked feature needs an offline/demo fallback

## MVP acceptance criteria

- New user can see the welcome screen and complete the assessment flow
- Benchmark comparison shows freshman, JV, and varsity targets
- A week-by-week training plan can be generated and viewed
- Technical, physical, and nutrition tracking are all visible and editable
- A food logger calculates calories and macros from saved entries
- Coach chat returns useful guidance and can adjust the plan
- Data persists across refreshes in the browser
- The app looks and feels like the Apple dark paper handoff, not a generic dashboard

