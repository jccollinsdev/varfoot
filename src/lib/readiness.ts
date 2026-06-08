// Varsity Readiness composite — single source of truth for the Readiness + Gap Analysis
// screens and the AI coach's context. Weighting is locked by the product spec:
//   Technical 40% / Physical+Recovery 25% / Speed-Stamina 15% / Nutrition-Fueling 10% /
//   Plan Readiness-Consistency 10%
// Every bucket score is computed by scoring.ts (direction-aware, clamped 0-100) from the
// drills measured during onboarding. See docs/scoring-model.md for the full mapping and
// docs/benchmark-assumptions.md for the invented "plan readiness" proxy.

import { getDrill, onboardingTechnicalDrills } from "@/data/drillCatalog";
import { classifyReadiness, scoreMetric, weightedComposite, type ReadinessLevel } from "./scoring";
import type { AssessmentState, DrillResult, RoadmapState } from "./varfoot";

export type ReadinessCategoryKey = "technical" | "physicalRecovery" | "speedStamina" | "nutrition" | "planReadiness";

export type ReadinessCategory = {
  key: ReadinessCategoryKey;
  label: string;
  weight: number;
  score: number;
  drillIds: string[];
};

export type ReadinessSummary = {
  overall: number;
  level: ReadinessLevel;
  categories: ReadinessCategory[];
  strongest: ReadinessCategory;
  weakest: ReadinessCategory;
};

const WEIGHTS: Record<ReadinessCategoryKey, number> = {
  technical: 0.4,
  physicalRecovery: 0.25,
  speedStamina: 0.15,
  nutrition: 0.1,
  planReadiness: 0.1,
};

const LABELS: Record<ReadinessCategoryKey, string> = {
  technical: "Technical",
  physicalRecovery: "Physical & recovery",
  speedStamina: "Speed & stamina",
  nutrition: "Nutrition & fueling",
  planReadiness: "Plan readiness",
};

// All 19 onboarding-measured drills (13 PDF skill drills + 6 physical/nutrition check-ins)
// are partitioned across the four measurable buckets — nothing is double-counted.
const TECHNICAL_IDS = onboardingTechnicalDrills.filter((d) => d.id !== "recovery-sprint-25").map((d) => d.id);
const SPEED_STAMINA_IDS = ["recovery-sprint-25"];
const PHYSICAL_RECOVERY_IDS = ["max-pushups", "plank-hold", "wall-sit-hold", "sleep-duration"];
const NUTRITION_IDS = ["daily-calories", "daily-water"];

function averageScore(ids: string[], drillResults: Record<string, DrillResult>): number {
  const scored = ids
    .map((id) => {
      const drill = getDrill(id);
      const result = drillResults[id];
      if (!drill || !result || result.skipped || result.value == null) return null;
      return scoreMetric(result.value, drill);
    })
    .filter((v): v is number => v != null);
  if (scored.length === 0) return 0;
  return scored.reduce((sum, v) => sum + v, 0) / scored.length;
}

/**
 * "Plan readiness" has no PDF-defined benchmark — it's an invented proxy (documented in
 * docs/benchmark-assumptions.md) for whether the player has actually set themselves up to
 * follow through: a real tryout date (40 pts), a realistic training frequency (up to 30
 * pts), and a generated roadmap to execute against (30 pts). Sums to at most 100.
 */
function planReadinessScore(assessment: AssessmentState, roadmap: RoadmapState | null | undefined): number {
  let score = 0;
  if (assessment.tryoutDate) score += 40;
  if (assessment.trainingDaysPerWeek >= 3) score += 30;
  else if (assessment.trainingDaysPerWeek >= 1) score += 15;
  if (roadmap?.generatedAt && roadmap.nodes.length > 0) score += 30;
  return Math.min(100, score);
}

export function computeReadiness(
  assessment: AssessmentState,
  drillResults: Record<string, DrillResult>,
  roadmap?: RoadmapState | null,
): ReadinessSummary {
  const categories: ReadinessCategory[] = [
    {
      key: "technical",
      label: LABELS.technical,
      weight: WEIGHTS.technical,
      drillIds: TECHNICAL_IDS,
      score: averageScore(TECHNICAL_IDS, drillResults),
    },
    {
      key: "physicalRecovery",
      label: LABELS.physicalRecovery,
      weight: WEIGHTS.physicalRecovery,
      drillIds: PHYSICAL_RECOVERY_IDS,
      score: averageScore(PHYSICAL_RECOVERY_IDS, drillResults),
    },
    {
      key: "speedStamina",
      label: LABELS.speedStamina,
      weight: WEIGHTS.speedStamina,
      drillIds: SPEED_STAMINA_IDS,
      score: averageScore(SPEED_STAMINA_IDS, drillResults),
    },
    {
      key: "nutrition",
      label: LABELS.nutrition,
      weight: WEIGHTS.nutrition,
      drillIds: NUTRITION_IDS,
      score: averageScore(NUTRITION_IDS, drillResults),
    },
    {
      key: "planReadiness",
      label: LABELS.planReadiness,
      weight: WEIGHTS.planReadiness,
      drillIds: [],
      score: planReadinessScore(assessment, roadmap),
    },
  ];

  const overall = weightedComposite(categories.map((c) => ({ score: c.score, weight: c.weight })));
  // Exclude planReadiness from strongest/weakest — it measures admin completion (setting a
  // tryout date, generating a roadmap), not a soccer skill, so surfacing it as "strongest"
  // confuses players and gives a misleading picture of athletic readiness.
  const skillCategories = [...categories.filter((c) => c.key !== "planReadiness")].sort((a, b) => b.score - a.score);

  return {
    overall,
    level: classifyReadiness(overall),
    categories,
    strongest: skillCategories[0],
    weakest: skillCategories[skillCategories.length - 1],
  };
}

export type GapItem = {
  drillId: string;
  name: string;
  category: string;
  unit: string;
  scoreDirection: "higher_is_better" | "lower_is_better";
  currentValue: number | null;
  freshmanTarget: number;
  jvTarget: number;
  varsityTarget: number;
  score: number;
  measured: boolean;
};

/** Every onboarding-measured drill vs. its freshman/JV/varsity targets, weakest first —
 * feeds the full Gap Analysis screen and the coach's "largest gaps" context. */
export function gapSummary(assessment: AssessmentState, drillResults: Record<string, DrillResult>): GapItem[] {
  const ids = [...TECHNICAL_IDS, ...SPEED_STAMINA_IDS, ...PHYSICAL_RECOVERY_IDS, ...NUTRITION_IDS];
  return ids
    .map((id): GapItem | null => {
      const drill = getDrill(id);
      if (!drill) return null;
      const result = drillResults[id];
      const measured = Boolean(result && !result.skipped && result.value != null);
      const currentValue = measured ? result!.value! : null;
      return {
        drillId: id,
        name: drill.name,
        category: drill.category,
        unit: drill.unit,
        scoreDirection: drill.scoreDirection,
        currentValue,
        freshmanTarget: drill.freshmanTarget,
        jvTarget: drill.jvTarget,
        varsityTarget: drill.varsityTarget,
        score: currentValue != null ? scoreMetric(currentValue, drill) : 0,
        measured,
      };
    })
    .filter((v): v is GapItem => v != null)
    .sort((a, b) => a.score - b.score);
}
