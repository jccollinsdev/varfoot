# VarFoot

VarFoot is a soccer-specific PWA for JV, freshman, and club players who want a clearer roadmap to varsity.

It includes:

- onboarding assessment flow
- freshman / JV / varsity benchmark comparison
- week-by-week training plan generation
- technical, physical, and nutrition tracking
- food logging with macro math
- AI coach chat
- local persistence with Supabase/Gemini integration points ready for real keys

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build checks

```bash
npm run lint
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local` when you want to wire real services:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

The app runs in demo mode without these values.

## Source materials

- `docs/BUILD_PLAN.md`
- `/Users/sansarkarki/Downloads/varfoot_prd_icp.md`
- `/Users/sansarkarki/Downloads/VarFoot_Final_Apple_Dark_Paper_All_Screens.html`
- `/Users/sansarkarki/Downloads/App for Hackathon - Google Docs.pdf`

## Notes

- The PDF source currently provides the physical assessment prompts and target references.
- The handoff HTML maps the larger 68-screen IA and design language.
- The app stores state in browser localStorage until Supabase is configured.
