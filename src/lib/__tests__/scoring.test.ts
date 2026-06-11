import { describe, expect, it } from "vitest";
import { classifyReadiness, scoreMetric, weightedComposite } from "../scoring";
import { computeNutritionTargets, type AssessmentState } from "../varfoot";

const HIB = { freshmanTarget: 40, jvTarget: 70, varsityTarget: 100, scoreDirection: "higher_is_better" as const };
const LIB = { freshmanTarget: 40, jvTarget: 25, varsityTarget: 10, scoreDirection: "lower_is_better" as const };

describe("scoreMetric — higher_is_better", () => {
  it("varsity target → 100", () => expect(scoreMetric(100, HIB)).toBe(100));
  it("jv target → 70", () => expect(scoreMetric(70, HIB)).toBe(70));
  it("freshman target → 40", () => expect(scoreMetric(40, HIB)).toBe(40));
  it("floor (0) → 0", () => expect(scoreMetric(0, HIB)).toBe(0));
  it("above varsity clamps to 100", () => expect(scoreMetric(120, HIB)).toBe(100));
  it("below floor clamps to 0", () => expect(scoreMetric(-5, HIB)).toBe(0));
  it("midpoint between jv and varsity → 85", () => expect(scoreMetric(85, HIB)).toBe(85));
  it("midpoint between freshman and jv → 55", () => expect(scoreMetric(55, HIB)).toBe(55));
});

describe("scoreMetric — lower_is_better", () => {
  // LIB anchors: varsity=10, jv=25, freshman=40; floor=2*40-10=70
  it("at varsity target → 100", () => expect(scoreMetric(10, LIB)).toBe(100));
  it("at jv target → 70", () => expect(scoreMetric(25, LIB)).toBe(70));
  it("at freshman target → 40", () => expect(scoreMetric(40, LIB)).toBe(40));
  it("at floor → 0", () => expect(scoreMetric(70, LIB)).toBe(0));
  it("better than varsity clamps to 100", () => expect(scoreMetric(5, LIB)).toBe(100));
  it("worse than floor clamps to 0", () => expect(scoreMetric(90, LIB)).toBe(0));
});

describe("scoreMetric — edge cases", () => {
  it("NaN → 0", () => expect(scoreMetric(NaN, HIB)).toBe(0));
  it("Infinity → 0 (non-finite guard)", () => expect(scoreMetric(Infinity, HIB)).toBe(0));
});

describe("classifyReadiness", () => {
  it("100 → varsity-ready", () => expect(classifyReadiness(100)).toBe("varsity-ready"));
  it("85 → jv", () => expect(classifyReadiness(85)).toBe("jv"));
  it("70 → jv", () => expect(classifyReadiness(70)).toBe("jv"));
  it("55 → freshman", () => expect(classifyReadiness(55)).toBe("freshman"));
  it("40 → freshman", () => expect(classifyReadiness(40)).toBe("freshman"));
  it("20 → below-freshman", () => expect(classifyReadiness(20)).toBe("below-freshman"));
});

describe("weightedComposite", () => {
  it("all 100s → 100", () => expect(weightedComposite([{ score: 100, weight: 0.5 }, { score: 100, weight: 0.5 }])).toBe(100));
  it("all 0s → 0", () => expect(weightedComposite([{ score: 0, weight: 0.5 }, { score: 0, weight: 0.5 }])).toBe(0));
  it("40/25/15/10/10 weights produce correct composite", () => {
    const parts = [
      { score: 80, weight: 0.40 },
      { score: 60, weight: 0.25 },
      { score: 70, weight: 0.15 },
      { score: 50, weight: 0.10 },
      { score: 90, weight: 0.10 },
    ];
    // 32 + 15 + 10.5 + 5 + 9 = 71.5
    expect(weightedComposite(parts)).toBeCloseTo(71.5, 0);
  });
  it("throws in dev when weights don't sum to 1", () => {
    expect(() => weightedComposite([{ score: 50, weight: 0.4 }, { score: 50, weight: 0.4 }])).toThrow();
  });
});

describe("computeNutritionTargets", () => {
  const assessment: AssessmentState = {
    name: "Jordan",
    age: "16",
    school: "Test HS",
    position: "Midfielder",
    heightInches: 68,
    weightLbs: 155,
    availableDays: [],
    currentLevel: "jv",
    targetLevel: "varsity",
    tryoutDate: null,
    trainingDaysPerWeek: 4,
    goalFocus: "",
  };

  it("uses a youth-athlete protein target instead of a high calorie-percentage target", () => {
    const targets = computeNutritionTargets(assessment);

    expect(targets.calorieTarget).toBe(3000);
    expect(targets.proteinTarget).toBe(105);
    expect(targets.proteinTarget).toBeLessThan(120);
    expect(targets.carbTarget).toBeGreaterThan(targets.proteinTarget);
  });
});
