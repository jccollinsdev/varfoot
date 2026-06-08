import { z } from "zod";

export const storageKey = "varfoot.app-state";
export const guestModeStorageKey = "varfoot.guest-mode";

/** The five bottom-nav destinations. Readiness/gap-analysis, drill library, and profile
 * are reached via push-navigation from these tabs rather than being tabs themselves. */
export type TabKey = "today" | "plan" | "train" | "fuel" | "coach";

export type CoachMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  createdAt: string;
};

/** "loading"/"error" drive the explicit retry UI in CoachScreen — no silent fake fallback text. */
export type CoachStatus = "idle" | "loading" | "error";

export type TeamLevel = "incoming-freshman" | "freshman" | "jv" | "varsity";

export const currentTeamLevels: TeamLevel[] = ["incoming-freshman", "freshman", "jv", "varsity"];
export const targetTeamLevels: TeamLevel[] = ["freshman", "jv", "varsity"];

export const teamLevelLabels: Record<TeamLevel, string> = {
  "incoming-freshman": "Incoming freshman",
  freshman: "Freshman",
  jv: "JV",
  varsity: "Varsity",
};

/**
 * Profile fields collected in the "Profile" onboarding section. Physical, nutrition/recovery,
 * and technical measurements all live in `drillResults` (keyed by drillCatalog id) so every
 * scored metric in the app — onboarding, readiness, progress, roadmap — flows through the
 * same scoring.ts + drillCatalog pipeline. See docs/scoring-model.md.
 */
export type AssessmentState = {
  name: string;
  age: string;
  school: string;
  position: string;
  heightInches: number | null;
  weightLbs: number | null;
  /** Optional exact weekdays the athlete is available to train (0 = Sun ... 6 = Sat). */
  availableDays: number[];
  currentLevel: TeamLevel | null;
  targetLevel: TeamLevel;
  /** ISO date string (yyyy-mm-dd), or null if the player hasn't set a tryout date yet. */
  tryoutDate: string | null;
  trainingDaysPerWeek: number;
  /** Free-text weight/performance goal, e.g. "add lean mass" or "quicker first step". */
  goalFocus: string;
};

/**
 * One measured result for a drillCatalog entry — raw value in the drill's own `unit`.
 * Populated during onboarding (the 13 PDF skill drills + 6 physical/nutrition check-ins)
 * and again whenever the player logs a roadmap drill from DrillDetail.
 */
export type DrillResult = {
  drillId: string;
  /** Raw measured value in the drill's `unit`. Null when the player skipped the drill. */
  value: number | null;
  recordedAt: string;
  /** True when the player chose "needs a partner / skip for now" — does not block progression. */
  skipped?: boolean;
  /** Where this measurement came from. "assessment" results seed the gap analysis but should
   * NOT make a roadmap session's drill look pre-completed — the player still has to log a
   * fresh rep for that session. Defaults to "session" for older saved states. */
  source?: "assessment" | "session";
};

/** True when a result counts as "logged" for roadmap-session purposes — assessment-time
 * baseline measurements don't count, so a freshly generated session never opens looking
 * like the player already finished drills they've only ever measured once, at onboarding. */
export function isLoggedForSession(result: DrillResult | undefined): boolean {
  return Boolean(result && result.source !== "assessment" && (result.skipped || result.value != null));
}

export type RoadmapNodeStatus = "locked" | "current" | "completed";

export type RoadmapNode = {
  id: string;
  /** 0-based sequential position on the path. */
  index: number;
  /** Short display label, e.g. "Day 4". */
  label: string;
  /** ISO date (yyyy-mm-dd) once scheduled against the goal date; null while still a future placeholder. */
  date: string | null;
  /** The drillCatalog category this day emphasizes (drives the node's icon + headline). */
  focusCategory: string;
  drillIds: string[];
  estimatedMinutes: number;
  status: RoadmapNodeStatus;
};

export type RoadmapState = {
  generatedAt: string | null;
  /** ISO date (yyyy-mm-dd) the roadmap is built toward — mirrors assessment.tryoutDate at generation time. */
  goalDate: string | null;
  nodes: RoadmapNode[];
};

export type MealType = "Breakfast" | "Lunch" | "Snack" | "Dinner";

export const mealTypes: MealType[] = ["Breakfast", "Lunch", "Snack", "Dinner"];

/**
 * One ingredient in a logged meal. Always sourced from a real USDA FoodData Central search
 * result (`fdcId` + per-serving macros computed server-side from the USDA `foodNutrients`
 * payload at the chosen amount) — never hand-typed or seeded. See /api/nutrition/search.
 */
export type MealIngredient = {
  id: string;
  fdcId: number;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Meal = {
  id: string;
  type: MealType;
  loggedAt: string;
  ingredients: MealIngredient[];
};

export type AppState = {
  onboardingComplete: boolean;
  activeTab: TabKey;
  assessment: AssessmentState;
  drillResults: Record<string, DrillResult>;
  roadmap: RoadmapState;
  nutrition: {
    calorieTarget: number;
    proteinTarget: number;
    carbTarget: number;
    fatTarget: number;
    meals: Meal[];
  };
  coach: {
    messages: CoachMessage[];
    draft: string;
    status: CoachStatus;
  };
  library: {
    savedDrills: string[];
  };
  ui: {
    sessionProgress: {
      currentDrillIndex: number;
      completedDrillIndexes: number[];
    };
  };
};

export const blankAssessment: AssessmentState = {
  name: "",
  age: "",
  school: "",
  position: "",
  heightInches: null,
  weightLbs: null,
  availableDays: [],
  currentLevel: null,
  targetLevel: "varsity",
  tryoutDate: null,
  trainingDaysPerWeek: 4,
  goalFocus: "",
};

/**
 * Daily macro targets derived from the PDF's 3,500 kcal/day varsity fueling goal using a
 * standard athlete split (~18% protein / ~50% carb / ~25% fat, rounded to clean numbers —
 * documented in docs/benchmark-assumptions.md). These are starting targets the player can
 * see progress against; they are not medical advice.
 */
export const defaultNutritionTargets = {
  calorieTarget: 3500,
  proteinTarget: 160,
  carbTarget: 440,
  fatTarget: 95,
};

/**
 * Compute personalized daily macro targets using Mifflin-St Jeor BMR × activity multiplier
 * + 200 kcal teen-growth allowance. Macros: 30% protein / 50% carbs / 20% fat.
 * Falls back to `defaultNutritionTargets` proportions if assessment data is missing.
 */
export function computeNutritionTargets(assessment: AssessmentState) {
  const weightKg = (assessment.weightLbs ?? 155) * 0.453592;
  const heightCm = (assessment.heightInches ?? 68) * 2.54;
  const age = Math.max(10, Math.min(30, parseInt(assessment.age) || 16));
  // Mifflin-St Jeor (male default — soccer training population skews male and PDF benchmarks reflect male targets)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const days = assessment.trainingDaysPerWeek;
  const activityFactor = days <= 1 ? 1.375 : days <= 3 ? 1.55 : days <= 5 ? 1.725 : 1.9;
  const calorieTarget = Math.round((bmr * activityFactor + 200) / 50) * 50;
  return {
    calorieTarget,
    proteinTarget: Math.round((calorieTarget * 0.30) / 4 / 5) * 5,
    carbTarget: Math.round((calorieTarget * 0.50) / 4 / 5) * 5,
    fatTarget: Math.round((calorieTarget * 0.20) / 9 / 5) * 5,
  };
}

/** Returns today's date as a local YYYY-MM-DD string (not UTC). */
export function localTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Converts an ISO timestamp to its local-date YYYY-MM-DD string for daily filtering. */
export function localDateOf(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `varfoot-${Math.random().toString(36).slice(2, 10)}`;
}

export function createBlankState(): AppState {
  return {
    onboardingComplete: false,
    activeTab: "today",
    assessment: { ...blankAssessment },
    drillResults: {},
    roadmap: {
      generatedAt: null,
      goalDate: null,
      nodes: [],
    },
    nutrition: {
      ...defaultNutritionTargets,
      meals: [],
    },
    coach: {
      messages: [],
      draft: "",
      status: "idle",
    },
    library: {
      savedDrills: [],
    },
    ui: {
      sessionProgress: {
        currentDrillIndex: 0,
        completedDrillIndexes: [],
      },
    },
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") {
    return createBlankState();
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return createBlankState();
  }

  try {
    return appStateSchema.parse(JSON.parse(raw));
  } catch {
    return createBlankState();
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function clearState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}

export function loadGuestMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(guestModeStorageKey) === "true";
}

export function saveGuestMode(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(guestModeStorageKey, enabled ? "true" : "false");
}

export function clearGuestMode() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(guestModeStorageKey);
}

const coachMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["assistant", "user"]),
  text: z.string(),
  createdAt: z.string(),
});

const drillResultSchema = z.object({
  drillId: z.string(),
  value: z.number().nullable(),
  recordedAt: z.string(),
  skipped: z.boolean().optional(),
  source: z.enum(["assessment", "session"]).optional(),
});

const roadmapNodeSchema = z.object({
  id: z.string(),
  index: z.number(),
  label: z.string(),
  date: z.string().nullable(),
  focusCategory: z.string(),
  drillIds: z.array(z.string()),
  estimatedMinutes: z.number(),
  status: z.enum(["locked", "current", "completed"]),
});

const mealIngredientSchema = z.object({
  id: z.string(),
  fdcId: z.number(),
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

const mealSchema = z.object({
  id: z.string(),
  type: z.enum(["Breakfast", "Lunch", "Snack", "Dinner"]),
  loggedAt: z.string(),
  ingredients: z.array(mealIngredientSchema),
});

export const appStateSchema = z.object({
  onboardingComplete: z.boolean(),
  activeTab: z.enum(["today", "plan", "train", "fuel", "coach"]),
  assessment: z.object({
    name: z.string(),
    age: z.string(),
    school: z.string(),
    position: z.string(),
    heightInches: z.number().nullable(),
    weightLbs: z.number().nullable(),
    availableDays: z.array(z.number().int().min(0).max(6)).default([]),
    currentLevel: z.enum(["incoming-freshman", "freshman", "jv", "varsity"]).nullable(),
    targetLevel: z.enum(["freshman", "jv", "varsity"]),
    tryoutDate: z.string().nullable(),
    trainingDaysPerWeek: z.number(),
    goalFocus: z.string().default(""),
  }),
  drillResults: z.record(z.string(), drillResultSchema),
  roadmap: z.object({
    generatedAt: z.string().nullable(),
    goalDate: z.string().nullable(),
    nodes: z.array(roadmapNodeSchema),
  }),
  nutrition: z.object({
    calorieTarget: z.number(),
    proteinTarget: z.number(),
    carbTarget: z.number(),
    fatTarget: z.number(),
    meals: z.array(mealSchema),
  }),
  coach: z.object({
    messages: z.array(coachMessageSchema),
    draft: z.string(),
    status: z.enum(["idle", "loading", "error"]),
  }),
  library: z.object({
    savedDrills: z.array(z.string()),
  }),
  ui: z.object({
    sessionProgress: z.object({
      currentDrillIndex: z.number(),
      completedDrillIndexes: z.array(z.number()),
    }),
  }),
});

const macroTotalsShape = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function getIngredientTotals(ingredients: MealIngredient[]) {
  return ingredients.reduce(
    (totals, item) => ({
      calories: totals.calories + item.calories,
      protein: totals.protein + item.protein,
      carbs: totals.carbs + item.carbs,
      fat: totals.fat + item.fat,
    }),
    { ...macroTotalsShape },
  );
}

export function getDailyNutritionTotals(meals: Meal[]) {
  return meals.reduce((totals, meal) => {
    const mealTotals = getIngredientTotals(meal.ingredients);
    return {
      calories: totals.calories + mealTotals.calories,
      protein: totals.protein + mealTotals.protein,
      carbs: totals.carbs + mealTotals.carbs,
      fat: totals.fat + mealTotals.fat,
    };
  }, { ...macroTotalsShape });
}

export function formatDuration(seconds: number) {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }

  return `${Math.round(seconds)}s`;
}

export function formatHeight(heightInches: number | null) {
  if (heightInches == null || !Number.isFinite(heightInches)) return "—";
  const feet = Math.floor(heightInches / 12);
  const inches = Math.round(heightInches % 12);
  return `${feet}'${inches}"`;
}
