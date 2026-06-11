# VarFoot Benchmark Assumptions

Date: 2026-06-11

## Core assumptions

- `100` means varsity-ready.
- Freshman benchmarks are calibrated to land around `40`.
- JV benchmarks are calibrated to land around `70`.
- Varsity targets land at `100`.
- The PDF supplied varsity targets for the 13 soccer assessment drills plus the physical / fueling checks now modeled in onboarding.
- Freshman and JV targets were inferred for every scored metric in the app, including the PDF drills and the expanded 50-drill catalog.
- Height and weight are collected for context only. They are not scored and do not directly penalize readiness.
- `availableDays` and `goalFocus` shape planning / coaching context only. They do not change readiness scoring.
- Nutrition targets are planning estimates. They are not medical prescriptions, and the coach prompt is instructed to avoid exact calorie/protein commands for minors.
- Protein targets use about `1.5 g/kg/day`, based on youth-athlete guidance, rather than a high percentage-of-calories formula.

## Scored profile caveats

- Height: contextual only, not scored.
- Weight: contextual only, not scored.
- Current level / target level / tryout date / training days: used for planning and plan-readiness, not raw athletic scoring.
- Weight / performance goal: coaching / roadmap context only, not scored directly.

## Nutrition caveats

VarFoot does not collect biological sex, puberty stage, medical history, or clinician guidance, so its nutrition math is intentionally conservative:

- Calorie estimates use a sex-neutral Mifflin-St Jeor midpoint.
- Protein targets are capped around `1.5 g/kg/day` and rounded to the nearest 5g.
- Fat uses about 25% of estimated calories.
- Carbohydrates receive the remaining estimated calories because soccer training is carbohydrate-demanding.

These estimates are intended to help a player notice whether they are under-fueled, hydrated, and recovering. They should not be presented as diet instructions.

## Direction + benchmarks

Every scored drill/metric below has invented freshman and JV targets unless explicitly marked as a varsity target drawn from the source PDF.

| Drill ID | Name | Source | Direction | Freshman (~40) | JV (~70) | Varsity (100) | Unit |
|---|---|---|---|---:|---:|---:|---|
| `wall-cushion-rebound` | The 5-Step Wall Cushion | `pdf` | `higher_is_better` | 9 | 14 | 18 | clean stops / 20 |
| `high-ball-drop-dead` | High Ball Drop-Dead | `pdf` | `higher_is_better` | 3 | 6 | 8 | controls / 10 |
| `gate-pass-15` | The 15-Step Gate Pass | `pdf` | `higher_is_better` | 8 | 13 | 17 | accurate passes / 20 |
| `long-ping-30` | The 30-Step Long Ping | `pdf` | `higher_is_better` | 3 | 5 | 7 | in target / 10 |
| `weak-foot-wall-routine` | Weak Foot Wall Routine | `pdf` | `higher_is_better` | 12 | 19 | 25 | passes / 60s |
| `cone-slalom-10` | The 10-Step Cone Slalom | `pdf` | `lower_is_better` | 16 | 12.5 | 10 | seconds |
| `box-shield` | The Box Shield | `pdf` | `higher_is_better` | 9 | 15 | 20 | seconds |
| `shoulder-check-wall-pass` | The Shoulder-Check Wall Pass | `pdf` | `higher_is_better` | 4 | 7 | 9 | scan + trap / 10 |
| `give-and-go-check-run` | Give-and-Go Check Run | `pdf` | `higher_is_better` | 5 | 7 | 9 | in-stride catches / 10 |
| `recovery-sprint-25` | The Recovery Sprint | `pdf` | `lower_is_better` | 6.4 | 5.4 | 4.5 | seconds |
| `ten-step-jockey` | The 10-Step Jockey | `pdf` | `higher_is_better` | 4 | 6 | 8 | successful delays / 10 |
| `poke-tackle-timing` | The Poke-Tackle Timing | `pdf` | `higher_is_better` | 3 | 5 | 7 | clean tackles / 10 |
| `header-clearance` | The Header Clearance | `pdf` | `higher_is_better` | 4 | 7 | 9 | clean headers / 10 |
| `max-pushups` | Max Pushups | `physical-assessment` | `higher_is_better` | 25 | 45 | 65 | reps |
| `plank-hold` | Plank Hold | `physical-assessment` | `higher_is_better` | 90 | 195 | 300 | seconds |
| `wall-sit-hold` | Wall Sit Hold | `physical-assessment` | `higher_is_better` | 75 | 175 | 270 | seconds |
| `daily-calories` | Daily Calorie Fueling | `physical-assessment` | `higher_is_better` | 2200 | 2900 | 3500 | kcal / day |
| `daily-water` | Daily Water Intake | `physical-assessment` | `higher_is_better` | 64 | 96 | 128 | fl oz / day |
| `sleep-duration` | Average Sleep Duration | `physical-assessment` | `higher_is_better` | 6 | 7.5 | 8.5 | hours / night |
| `juggling-control` | Juggling Control Count | `catalog` | `higher_is_better` | 15 | 35 | 60 | consecutive touches |
| `sole-roll-combo` | Sole Roll Combo | `catalog` | `higher_is_better` | 8 | 14 | 20 | clean changes / 30s |
| `two-touch-wall-combo` | Two-Touch Wall Combo | `catalog` | `higher_is_better` | 6 | 10 | 13 | clean combos / 15 |
| `inside-outside-cone-cut` | Inside-Outside Cone Cut | `catalog` | `lower_is_better` | 16 | 12 | 9 | seconds |
| `figure-eight-dribble` | Figure-8 Dribble | `catalog` | `lower_is_better` | 32 | 24 | 18 | seconds |
| `one-touch-passing-square` | One-Touch Passing Square | `catalog` | `higher_is_better` | 10 | 14 | 17 | accurate passes / 20 |
| `driven-ball-switch` | Driven Ball Switch | `catalog` | `higher_is_better` | 3 | 5 | 7 | on target / 10 |
| `weak-foot-finishing` | Weak Foot Finishing | `catalog` | `higher_is_better` | 1 | 3 | 6 | goals / 10 |
| `weak-foot-juggling` | Weak Foot Juggling | `catalog` | `higher_is_better` | 4 | 8 | 12 | consecutive touches |
| `power-strike-target` | Power Strike Target | `catalog` | `higher_is_better` | 3 | 6 | 8 | on frame / 10 |
| `first-time-finish` | First-Time Finish | `catalog` | `higher_is_better` | 1 | 3 | 6 | goals / 10 |
| `curl-and-place-free-kick` | Curl-and-Place Free Kick | `catalog` | `higher_is_better` | 1 | 3 | 6 | in target / 10 |
| `pro-agility-shuttle` | 5-10-5 Pro Agility Shuttle | `catalog` | `lower_is_better` | 6.4 | 5.4 | 4.7 | seconds |
| `thirty-yard-sprint` | 30-Yard Sprint | `catalog` | `lower_is_better` | 5.3 | 4.6 | 4.1 | seconds |
| `beep-test-level` | Beep Test Level | `catalog` | `higher_is_better` | 5 | 7 | 9 | level reached |
| `yoyo-intermittent-level` | Yo-Yo Intermittent Level | `catalog` | `higher_is_better` | 12 | 16 | 19 | level reached |
| `plyo-box-jumps` | Plyometric Box Jumps | `catalog` | `higher_is_better` | 14 | 21 | 28 | clean reps / 60s |
| `single-leg-balance-hold` | Single-Leg Balance Hold | `catalog` | `higher_is_better` | 25 | 50 | 75 | seconds |
| `core-plank-rotation` | Core Plank Rotation | `catalog` | `higher_is_better` | 8 | 14 | 20 | clean reps |
| `standing-long-jump` | Standing Long Jump | `catalog` | `higher_is_better` | 64 | 76 | 88 | inches |
| `one-v-one-close-down` | 1v1 Close-Down Defending | `catalog` | `higher_is_better` | 3 | 5 | 8 | stops / 10 |
| `recovery-run-reaction` | Recovery Run Reaction | `catalog` | `lower_is_better` | 3.6 | 3.0 | 2.4 | seconds |
| `field-scan-frequency` | Field Scan Frequency Drill | `catalog` | `higher_is_better` | 3 | 5 | 7 | scans / 60s |
| `blind-side-run-timing` | Blind-Side Run Timing | `catalog` | `higher_is_better` | 4 | 6 | 8 | good runs / 10 |
| `overlap-and-return` | Overlap and Return | `catalog` | `higher_is_better` | 4 | 6 | 8 | completed / 10 |
| `crossing-far-post-run` | Crossing and Far-Post Run | `catalog` | `higher_is_better` | 2 | 4 | 6 | on frame / 10 |
| `flick-on-header-control` | Flick-On Header Control | `catalog` | `higher_is_better` | 3 | 5 | 7 | controlled / 10 |
| `sliding-tackle-technique` | Sliding Tackle Technique | `catalog` | `higher_is_better` | 1 | 3 | 6 | clean slides / 10 |
| `reaction-ball-drop-catch` | Reaction Ball Drop Catch | `catalog` | `higher_is_better` | 4 | 6 | 8 | catches / 10 |
| `hydration-checkin` | Hydration Habit Check-In | `catalog` | `higher_is_better` | 2 | 4 | 6 | days on target / 7 |
| `sleep-recovery-routine` | Sleep & Recovery Routine Check-In | `catalog` | `higher_is_better` | 2 | 4 | 6 | nights 8h+ / 7 |

## PDF-specific notes

- The `pdf` and `physical-assessment` rows above are the onboarding-measured requirements lifted from the supplied product brief/PDF, with freshman/JV values inferred to create the 40/70/100 scale.
- The `catalog` rows are additional soccer-specific drills added for the roadmap/library so the app can generate varied, sport-specific training beyond the initial assessment.
