# VarFoot Backlog

Items that are useful after the LexHack submission, but are no longer blockers for the demo.

---

## P1 - Upload the final demo video

The generated local video should land at:

`demo/varfoot-demo-2min.mp4`

Upload it to YouTube or Vimeo with embedding enabled, then paste the hosted link into Devpost. Devpost requires a hosted demo video; a local MP4 in the repo is not enough.

---

## P2 - Add biological-sex or growth-context nutrition settings

Current state:

- Calorie targets use a sex-neutral Mifflin-St Jeor midpoint because the app does not collect biological sex.
- Protein is capped around `1.5 g/kg/day`, a conservative youth-athlete planning estimate.
- Coach prompts explicitly avoid medical-style nutrition prescriptions.

Future improvement:

- Add an optional, carefully worded nutrition-settings screen.
- Explain why the question is being asked.
- Let players skip it.
- Keep guidance framed as estimates and encourage parent/clinician support.

---

## P3 - Make streaks calendar-aware

Current state:

- The app labels the value as a **session streak**.
- It counts consecutive completed roadmap nodes.

Future improvement:

- Track completion dates separately from scheduled node dates.
- Decide whether missed sessions break the streak or simply pause it.
- Show both "sessions completed" and "calendar streak" if both are useful.

---

## P4 - Harden benchmark validation with coaches

Current state:

- Varsity targets are treated as the top anchor.
- Freshman/JV anchors are modeled so the score can communicate progress.

Future improvement:

- Interview one or two soccer coaches.
- Tune freshman/JV anchors by position and age band.
- Add an in-app note that benchmarks are training references, not selection guarantees.

---

## P5 - Keep coach context compact

Current state:

- Coach messages are stored in app state and synced.
- The Gemini request uses recent history, not the entire conversation.

Future improvement:

- Truncate persisted coach history after a safe limit.
- Add a summary field if long-term conversation memory becomes useful.
