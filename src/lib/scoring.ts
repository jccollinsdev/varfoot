// VarFoot scoring engine — single source of truth for "progress toward varsity".
//
// MODEL (documented in full in docs/scoring-model.md):
//   100 = varsity-ready (the only score that should ever read as "full")
//   70  = JV level
//   40  = freshman level
//   <40 = below freshman
//
// Every metric is scored by piecewise-linear interpolation through four anchor
// points: floor -> freshman -> jv -> varsity, mapped to raw scores 0 -> 40 -> 70 -> 100.
// The function is direction-aware:
//   - higher_is_better (counts, accuracy, hold times): more raw value = higher score.
//     The floor anchor is 0 (you cannot do negative pushups).
//   - lower_is_better (stopwatch drills: cone slalom, recovery sprint): less raw
//     value = higher score. The floor anchor is the mirror image of the freshman
//     target around the varsity target (2*freshman - varsity), so a player who is
//     as far *below* freshman as freshman is *above* varsity scores 0.
// Scores are clamped to [0, 100] — a metric can never display as "full" unless the
// raw value has actually reached (or beaten) the varsity target.

export type ScoreDirection = "higher_is_better" | "lower_is_better";

export type ScoreAnchors = {
  freshmanTarget: number;
  jvTarget: number;
  varsityTarget: number;
  scoreDirection: ScoreDirection;
};

export type ReadinessLevel = "below-freshman" | "freshman" | "jv" | "varsity-ready";

const ANCHOR_SCORES = { floor: 0, freshman: 40, jv: 70, varsity: 100 } as const;

function lerp(value: number, fromValue: number, toValue: number, fromScore: number, toScore: number) {
  if (fromValue === toValue) return toScore;
  const t = (value - fromValue) / (toValue - fromValue);
  return fromScore + t * (toScore - fromScore);
}

/**
 * Convert a raw measured value into a 0-100 "progress toward varsity" score.
 * Always returns a finite number clamped to [0, 100].
 */
export function scoreMetric(rawValue: number, anchors: ScoreAnchors): number {
  const { freshmanTarget, jvTarget, varsityTarget, scoreDirection } = anchors;
  if (!Number.isFinite(rawValue)) return 0;

  if (scoreDirection === "higher_is_better") {
    const floor = 0;
    if (rawValue >= varsityTarget) return 100;
    if (rawValue >= jvTarget) return clamp(lerp(rawValue, jvTarget, varsityTarget, ANCHOR_SCORES.jv, ANCHOR_SCORES.varsity));
    if (rawValue >= freshmanTarget) return clamp(lerp(rawValue, freshmanTarget, jvTarget, ANCHOR_SCORES.freshman, ANCHOR_SCORES.jv));
    if (rawValue <= floor) return 0;
    return clamp(lerp(rawValue, floor, freshmanTarget, ANCHOR_SCORES.floor, ANCHOR_SCORES.freshman));
  }

  // lower_is_better: smaller raw value = closer to / past the varsity target.
  const floor = 2 * freshmanTarget - varsityTarget; // mirror of freshman around varsity
  if (rawValue <= varsityTarget) return 100;
  if (rawValue <= jvTarget) return clamp(lerp(rawValue, varsityTarget, jvTarget, ANCHOR_SCORES.varsity, ANCHOR_SCORES.jv));
  if (rawValue <= freshmanTarget) return clamp(lerp(rawValue, jvTarget, freshmanTarget, ANCHOR_SCORES.jv, ANCHOR_SCORES.freshman));
  if (rawValue >= floor) return 0;
  return clamp(lerp(rawValue, freshmanTarget, floor, ANCHOR_SCORES.freshman, ANCHOR_SCORES.floor));
}

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

/** Classify a 0-100 composite score into the four named readiness levels. */
export function classifyReadiness(score: number): ReadinessLevel {
  if (score >= 100) return "varsity-ready";
  if (score >= 70) return "jv";
  if (score >= 40) return "freshman";
  return "below-freshman";
}

export const readinessLevelLabels: Record<ReadinessLevel, string> = {
  "below-freshman": "Below freshman",
  freshman: "Freshman",
  jv: "JV",
  "varsity-ready": "Varsity-ready",
};

/**
 * Progress fraction (0-1) for a single metric's bar fill, scaled across the same
 * floor -> varsity range used for scoring, so a bar visually matches its score.
 */
export function progressFraction(rawValue: number, anchors: ScoreAnchors): number {
  return scoreMetric(rawValue, anchors) / 100;
}

/** How far the raw value is from the varsity target, signed in the metric's own unit. */
export function gapToVarsity(rawValue: number, anchors: ScoreAnchors): number {
  if (anchors.scoreDirection === "higher_is_better") {
    return Math.max(0, anchors.varsityTarget - rawValue);
  }
  return Math.max(0, rawValue - anchors.varsityTarget);
}

export function hasReachedVarsity(rawValue: number, anchors: ScoreAnchors): boolean {
  return anchors.scoreDirection === "higher_is_better"
    ? rawValue >= anchors.varsityTarget
    : rawValue <= anchors.varsityTarget;
}

/** Weighted composite of category scores. Weights must sum to 1; throws in dev if not. */
export function weightedComposite(parts: Array<{ score: number; weight: number }>): number {
  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  if (process.env.NODE_ENV !== "production" && Math.abs(totalWeight - 1) > 0.001) {
    throw new Error(`weightedComposite: weights must sum to 1, got ${totalWeight}`);
  }
  const weighted = parts.reduce((sum, p) => sum + p.score * p.weight, 0);
  return clamp(weighted);
}
