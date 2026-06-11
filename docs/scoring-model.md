# VarFoot Scoring Model

Date: 2026-06-11

## What the score means

- `100` means varsity-ready.
- `70` means roughly JV level.
- `40` means roughly freshman level.
- Scores below `40` are below the assumed freshman benchmark.

## Single-metric interpolation

Every scored metric uses four anchor points:

- floor -> `0`
- freshman target -> `40`
- JV target -> `70`
- varsity target -> `100`

The interpolation is piecewise linear between each anchor.

### Higher-is-better metrics

Examples: pushups, plank hold, passing accuracy, sleep hours, water intake.

- Floor anchor is `0`.
- If the raw value is at or above varsity, the metric scores `100`.
- If the raw value is between JV and varsity, interpolate between `70` and `100`.
- If the raw value is between freshman and JV, interpolate between `40` and `70`.
- If the raw value is between `0` and freshman, interpolate between `0` and `40`.

### Lower-is-better metrics

Examples: cone slalom time, recovery sprint time, shuttle times.

- Lower raw time means better score.
- Varsity target still maps to `100`.
- JV and freshman targets still map to `70` and `40`.
- The floor anchor is mirrored around varsity: `floor = 2 * freshmanTarget - varsityTarget`.
- Raw values slower than that mirrored floor clamp to `0`.

This prevents slow times from incorrectly showing full bars just because they are numerically larger.

## Bar-fill logic

- Metric bars use the exact same scoring output as the numeric model.
- A full bar only appears when the athlete actually reaches or beats the varsity target.
- Lower-is-better drills fill the bar when time drops, not when it rises.

## Composite readiness weights

The readiness composite in [`src/lib/readiness.ts`](../src/lib/readiness.ts) uses:

- Technical: `40%`
- Physical & recovery: `25%`
- Speed & stamina: `15%`
- Nutrition & fueling: `10%`
- Plan readiness: `10%`

The composite is a weighted average of category scores and is clamped to `[0, 100]`.

## Category construction

### Technical

- Built from the onboarding technical assessment drills.
- Excludes `recovery-sprint-25`, which is treated as speed/stamina.

### Physical & recovery

- `max-pushups`
- `plank-hold`
- `wall-sit-hold`
- `sleep-duration`

### Speed & stamina

- `recovery-sprint-25`

### Nutrition & fueling

- `daily-calories`
- `daily-water`

### Plan readiness

This is an explicit product assumption, not a PDF benchmark:

- tryout date present -> `40`
- training days per week at least 3 -> `30`
- training days per week 1-2 -> `15`
- roadmap generated -> `30`

Maximum plan-readiness score is `100`.

## Physical, recovery, and nutrition handling

- Physical performance metrics are scored exactly like technical drills through the same interpolation engine.
- Recovery / nutrition check-ins are treated as real scored habits, not decorative logs.
- Calories, water, and sleep count toward readiness because the product spec treats fueling/recovery as part of varsity preparedness.
- Height and weight are intentionally excluded from readiness penalties. They inform context only.
- Macro targets are planning estimates, not medical prescriptions. The app does not collect biological sex, so calorie estimates use a sex-neutral midpoint of the Mifflin-St Jeor constants.
- Protein targets use roughly `1.5 g/kg/day`, rounded to the nearest 5g, instead of a fixed percentage of calories. This follows youth-athlete nutrition guidance that commonly centers near 1.5 g/kg/day and avoids pushing teen players toward excessive protein.
- Carbohydrates absorb the remaining energy after protein and fat because soccer training depends heavily on available carbohydrate.
- The AI coach prompt explicitly avoids telling minors to hit exact calorie/protein numbers as commands. It frames nutrition around balanced meals, snacks, hydration, and checking with a parent, coach, registered dietitian, or clinician when needed.

Reference points used for the safety adjustment:

- American Academy of Pediatrics / HealthyChildren.org: [Protein for the Teen Athlete](https://www.healthychildren.org/English/ages-stages/teen/nutrition/Pages/Protein-for-the-Teen-Athlete.aspx)
- Journal of the Pediatric Orthopaedic Society of North America: [Nutritional Recommendations for the Young Athlete](https://jposna.org/index.php/jposna/article/view/599/702)

## Gap analysis

Gap analysis sorts onboarding-measured drills weakest-first by current metric score.

- Measured drill -> score comes from the real logged raw value.
- Skipped / unmeasured drill -> shown honestly as unmeasured rather than silently inflated.
- Varsity reach checks are direction-aware.
