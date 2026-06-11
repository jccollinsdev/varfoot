// Builds the rich, real-data prompt context for the AI coach — profile, readiness, gaps,
// today's roadmap session, and today's nutrition. Used by /api/coach so Gemini answers
// from the player's actual state rather than generic advice.

import { drillsById } from "@/data/drillCatalog";
import { computeReadiness, gapSummary } from "./readiness";
import { getDailyNutritionTotals, localDateOf, localTodayIso, teamLevelLabels, type AppState } from "./varfoot";

export function buildCoachContext(state: AppState): string {
  const { assessment, drillResults, roadmap, nutrition } = state;
  const today = localTodayIso();
  const readiness = computeReadiness(assessment, drillResults, roadmap);
  const gaps = gapSummary(assessment, drillResults).slice(0, 5);

  const lines: string[] = [];

  lines.push(
    `Player: ${assessment.name || "unnamed"}, age ${assessment.age || "unknown"}, position ${assessment.position || "unknown"}.`,
  );
  lines.push(
    `Goal: make the ${teamLevelLabels[assessment.targetLevel]} team` +
      (assessment.tryoutDate ? `; tryouts on ${assessment.tryoutDate}` : " (no tryout date set yet)") +
      `; trains ${assessment.trainingDaysPerWeek} day(s) per week.`,
  );
  if (assessment.availableDays.length > 0) {
    const dayLabels = assessment.availableDays
      .map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day] ?? null)
      .filter(Boolean)
      .join(", ");
    lines.push(`Available days: ${dayLabels}.`);
  }
  if (assessment.goalFocus.trim()) {
    lines.push(`Weight/performance goal: ${assessment.goalFocus.trim()}.`);
  }
  lines.push(
    `Varsity readiness: ${readiness.overall.toFixed(0)}/100 (${readiness.level}). ` +
      `Strongest area: ${readiness.strongest.label} (${readiness.strongest.score.toFixed(0)}/100). ` +
      `Weakest area: ${readiness.weakest.label} (${readiness.weakest.score.toFixed(0)}/100).`,
  );

  if (gaps.length) {
    lines.push("Largest measured gaps right now (weakest first):");
    for (const gap of gaps) {
      const status = gap.measured
        ? `currently ${gap.currentValue} ${gap.unit} (score ${gap.score.toFixed(0)}/100)`
        : "not yet measured";
      lines.push(`- ${gap.name} [${gap.category}]: ${status}`);
    }
  }

  if (roadmap.nodes.length) {
    const completed = roadmap.nodes.filter((n) => n.status === "completed").length;
    lines.push(
      `Roadmap: ${completed}/${roadmap.nodes.length} sessions completed, building toward ${roadmap.goalDate ?? "an undated goal"}.`,
    );
    const current = roadmap.nodes.find((n) => n.status === "current");
    if (current) {
      const drillNames = current.drillIds.map((id) => drillsById[id]?.name).filter(Boolean).join(", ");
      const timingLabel = current.date === today ? "Today's session" : "Next scheduled session";
      lines.push(`${timingLabel} ("${current.label}", focus: ${current.focusCategory}, ~${current.estimatedMinutes} min total): ${drillNames || "no drills scheduled"}.`);
    }
  } else {
    lines.push("Roadmap: not generated yet.");
  }

  const totals = getDailyNutritionTotals(nutrition.meals.filter((m) => localDateOf(m.loggedAt) === today));
  lines.push(
    `Today's nutrition logged so far: ${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)}g protein ` +
      `(planning estimates, not medical prescriptions: ${nutrition.calorieTarget} kcal / ${nutrition.proteinTarget}g protein).`,
  );
  lines.push(
    "Nutrition safety: the player is a teenager. Do not prescribe exact calorie/protein targets as commands, do not tell them to log food they have not eaten, and frame fueling advice as balanced meals/snacks, hydration, and checking with a parent, coach, or clinician for personalized nutrition.",
  );

  return lines.join("\n");
}
