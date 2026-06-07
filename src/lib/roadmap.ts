// VarFoot roadmap generator — turns assessment gaps + a goal date + training availability
// into a Duolingo-style sequence of daily nodes. Documented in docs/scoring-model.md.
//
// Inputs: the player's profile (tryout date, training days/week), every measured drill
// result so far (drillResults), and the 50-drill catalog (category, estimatedMinutes,
// muscleGroups, loadType). Output: an ordered list of RoadmapNode, each carrying 2-3
// drillIds chosen by a greedy "largest gap first" scheduler that also load-balances
// (no repeated muscle group two days running, technical work always anchors the day).
//
// Regeneration rule: nodes already marked "completed" are carried over untouched —
// only the current + future (locked) portion of the path is replaced.

import { drillCatalog, type Drill, type DrillCategory } from "@/data/drillCatalog";
import { scoreMetric } from "./scoring";
import {
  makeId,
  type AssessmentState,
  type DrillResult,
  type RoadmapNode,
  type RoadmapState,
} from "./varfoot";

export const DEFAULT_ROADMAP_LENGTH_DAYS = 28;
const MIN_ROADMAP_LENGTH_DAYS = 14;
const MAX_ROADMAP_NODES = 40;
const SESSION_MINUTES_BUDGET = 45;

/** Bucket weights mirror the readiness composite (Technical 40% / Physical+Recovery 25% /
 * Speed-Stamina 15% / Nutrition 10% / Plan-Readiness 10%) so the schedule spends most of
 * its sessions on the highest-weighted, highest-gap work. */
export const CATEGORY_BUCKET: Record<DrillCategory, "technical" | "physical" | "conditioning" | "recovery"> = {
  "First Touch": "technical",
  Passing: "technical",
  "Weak Foot": "technical",
  Dribbling: "technical",
  "Ball Mastery": "technical",
  "Shooting/Finishing": "technical",
  Defending: "technical",
  Scanning: "technical",
  "Off-Ball Movement": "technical",
  "Aerial Ability": "technical",
  "Speed/Agility": "conditioning",
  Stamina: "conditioning",
  "Strength/Core": "physical",
  "Recovery/Nutrition": "recovery",
};

/** day-of-week indices (0 = Sunday) spread across the week for each training frequency. */
const TRAINING_DAY_PATTERNS: Record<number, number[]> = {
  1: [3],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 4, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

function daysBetween(fromIso: string, toIso: string) {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function dayOfWeek(iso: string) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

function resolveTrainingDays(assessment: AssessmentState) {
  const explicitDays = [...new Set(assessment.availableDays)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
  if (explicitDays.length > 0) {
    return explicitDays;
  }
  return TRAINING_DAY_PATTERNS[Math.min(7, Math.max(1, assessment.trainingDaysPerWeek))] ?? TRAINING_DAY_PATTERNS[4];
}

/** How far this drill's last known result sits from its varsity target, as a 0-100 gap.
 * Unmeasured drills are treated as sitting at the freshman line — a real, sizeable gap,
 * but ranked below a measured result that's actually worse than freshman. */
function gapScore(drill: Drill, drillResults: Record<string, DrillResult>) {
  const result = drillResults[drill.id];
  const raw = result && !result.skipped && result.value != null ? result.value : drill.freshmanTarget;
  return 100 - scoreMetric(raw, drill);
}

type RankedDrill = { drill: Drill; gap: number };

function rankByGap(drills: Drill[], drillResults: Record<string, DrillResult>): RankedDrill[] {
  return drills
    .map((drill) => ({ drill, gap: gapScore(drill, drillResults) }))
    .sort((a, b) => b.gap - a.gap);
}

function pickNext(
  ranked: RankedDrill[],
  used: Set<string>,
  avoidMuscleGroups: Set<string>,
): Drill | null {
  // Prefer the largest gap that doesn't repeat a muscle group from the prior session.
  const fresh = ranked.find((r) => !used.has(r.drill.id) && !r.drill.muscleGroups.some((m) => avoidMuscleGroups.has(m)));
  if (fresh) return fresh.drill;
  // Fall back to the largest gap that simply hasn't been used yet today.
  const any = ranked.find((r) => !used.has(r.drill.id));
  return any?.drill ?? null;
}

const RECOVERY_ROTATION = ["daily-calories", "daily-water", "sleep-duration", "hydration-checkin", "sleep-recovery-routine"];

export function generateRoadmap(params: {
  assessment: AssessmentState;
  drillResults: Record<string, DrillResult>;
  existing?: RoadmapState | null;
  today?: Date;
}): RoadmapState {
  const { assessment, drillResults, existing } = params;
  const today = params.today ?? new Date();
  const todayIso = toIsoDate(today);

  const requestedGoal = assessment.tryoutDate && daysBetween(todayIso, assessment.tryoutDate) >= MIN_ROADMAP_LENGTH_DAYS
    ? assessment.tryoutDate
    : addDays(todayIso, DEFAULT_ROADMAP_LENGTH_DAYS);

  const pattern = resolveTrainingDays(assessment);

  const technical = rankByGap(drillCatalog.filter((d) => CATEGORY_BUCKET[d.category] === "technical"), drillResults);
  const conditioning = rankByGap(drillCatalog.filter((d) => CATEGORY_BUCKET[d.category] === "conditioning"), drillResults);
  const physical = rankByGap(drillCatalog.filter((d) => CATEGORY_BUCKET[d.category] === "physical"), drillResults);
  const physicalOrConditioning = rankByGap(
    drillCatalog.filter((d) => CATEGORY_BUCKET[d.category] === "conditioning" || CATEGORY_BUCKET[d.category] === "physical"),
    drillResults,
  );

  // Carry over completed nodes from the existing roadmap untouched (immutable history).
  const carriedOver = (existing?.nodes ?? []).filter((n) => n.status === "completed");
  const carriedIds = new Set(carriedOver.map((n) => n.id));
  const startIndex = carriedOver.length;

  const nodes: RoadmapNode[] = [...carriedOver];
  let cursor = todayIso;
  let recentMuscleGroups = new Set<string>();
  let lastTechnicalCategory: DrillCategory | null = null;
  let dayCount = 0;

  while (nodes.length < MAX_ROADMAP_NODES) {
    cursor = addDays(cursor, 1);
    if (daysBetween(cursor, requestedGoal) < 0) break;
    if (!pattern.includes(dayOfWeek(cursor))) continue;

    dayCount += 1;
    const usedToday = new Set<string>(carriedIds);
    const picks: Drill[] = [];

    // 1) Technical anchor — always the day's largest technical gap, rotating categories.
    const technicalPick =
      pickNext(
        technical.filter((r) => r.drill.category !== lastTechnicalCategory),
        usedToday,
        new Set(),
      ) ?? pickNext(technical, usedToday, new Set());
    if (technicalPick) {
      picks.push(technicalPick);
      usedToday.add(technicalPick.id);
      lastTechnicalCategory = technicalPick.category;
    }

    // 2) Conditioning/physical — load-balanced against yesterday's muscle groups.
    const secondPick = pickNext(
      dayCount % 2 === 0 ? physical : conditioning,
      usedToday,
      recentMuscleGroups,
    ) ?? pickNext(physicalOrConditioning, usedToday, recentMuscleGroups);
    if (secondPick) {
      picks.push(secondPick);
      usedToday.add(secondPick.id);
    }

    // 3) Recovery/nutrition check-in — every other session, rotating through the habits.
    if (dayCount % 2 === 1) {
      const recoveryId = RECOVERY_ROTATION[Math.floor(dayCount / 2) % RECOVERY_ROTATION.length];
      const recoveryDrill = drillCatalog.find((d) => d.id === recoveryId);
      if (recoveryDrill) picks.push(recoveryDrill);
    }

    if (picks.length === 0) continue;

    recentMuscleGroups = new Set(picks.flatMap((d) => d.muscleGroups));
    const estimatedMinutes = Math.min(
      SESSION_MINUTES_BUDGET,
      picks.reduce((sum, d) => sum + d.estimatedMinutes, 0),
    );

    const index = nodes.length;
    nodes.push({
      id: makeId(),
      index,
      label: `Day ${index - startIndex + 1}`,
      date: cursor,
      focusCategory: technicalPick?.category ?? picks[0].category,
      drillIds: picks.map((d) => d.id),
      estimatedMinutes,
      status: index === startIndex ? "current" : "locked",
    });
  }

  return {
    generatedAt: today.toISOString(),
    goalDate: requestedGoal,
    nodes,
  };
}

/** Marks the given node completed and promotes the next locked node to "current". */
export function completeRoadmapNode(roadmap: RoadmapState, nodeId: string): RoadmapState {
  const nodes = roadmap.nodes.map((n) => (n.id === nodeId ? { ...n, status: "completed" as const } : n));
  const completedIndex = nodes.findIndex((n) => n.id === nodeId);
  if (completedIndex >= 0) {
    const next = nodes.findIndex((n, i) => i > completedIndex && n.status === "locked");
    if (next >= 0) nodes[next] = { ...nodes[next], status: "current" };
  }
  return { ...roadmap, nodes };
}
