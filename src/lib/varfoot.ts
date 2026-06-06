import { formatDistanceToNowStrict } from "date-fns";
import { z } from "zod";

export const storageKey = "varfoot.app-state";

export type TabKey =
  | "today"
  | "assess"
  | "plan"
  | "train"
  | "fuel"
  | "coach"
  | "library"
  | "profile";

export type CoachMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  createdAt: string;
};

export type FoodEntry = {
  id: string;
  meal: "Breakfast" | "Lunch" | "Snack" | "Dinner";
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type PlanSession = {
  day: string;
  title: string;
  drill: string;
  duration: string;
  focus: string;
  target: string;
  status: "done" | "today" | "queued";
};

export type PlanWeek = {
  week: number;
  label: string;
  emphasis: string;
  readinessNote: string;
  sessions: PlanSession[];
};

export type AssessmentState = {
  name: string;
  age: string;
  school: string;
  position: string;
  seasonGoal: string;
  height: string;
  weight: string;
  pushups: number;
  plankSeconds: number;
  wallSitSeconds: number;
  passing: number;
  shooting: number;
  dribbling: number;
  firstTouch: number;
  speed: number;
};

export type AppState = {
  onboardingComplete: boolean;
  activeTab: TabKey;
  selectedWeek: number;
  assessment: AssessmentState;
  plan: {
    generatedAt: string | null;
    weeks: PlanWeek[];
  };
  nutrition: {
    calorieTarget: number;
    proteinTarget: number;
    carbTarget: number;
    fatTarget: number;
    entries: FoodEntry[];
  };
  coach: {
    messages: CoachMessage[];
    draft: string;
  };
  library: {
    savedDrills: string[];
  };
  ui: {
    demoLoaded: boolean;
  };
};

export type MetricKey =
  | "passing"
  | "shooting"
  | "dribbling"
  | "firstTouch"
  | "speed"
  | "pushups"
  | "plankSeconds"
  | "wallSitSeconds";

type BenchmarkLevel = {
  freshman: number;
  jv: number;
  varsity: number;
  higherIsBetter?: boolean;
  label: string;
  unit: string;
};

export const assessmentLabels: Record<MetricKey, string> = {
  passing: "Passing",
  shooting: "Shooting",
  dribbling: "Dribbling",
  firstTouch: "First touch",
  speed: "Speed",
  pushups: "Pushups",
  plankSeconds: "Plank",
  wallSitSeconds: "Wall sit",
};

export const screenMap = [
  "Launch / Welcome",
  "Sign In",
  "Create Account",
  "Forgot Password",
  "Profile Setup",
  "Assessment Hub",
  "Benchmark Summary",
  "Plan Roadmap",
  "Dashboard Overview",
  "Nutrition Overview",
  "AI Coach Chat",
  "Drill Library",
] as const;

export const assessmentBenchmarks: Record<MetricKey, BenchmarkLevel> = {
  passing: {
    freshman: 56,
    jv: 74,
    varsity: 88,
    higherIsBetter: true,
    label: "Wall pass accuracy",
    unit: "%",
  },
  shooting: {
    freshman: 44,
    jv: 63,
    varsity: 81,
    higherIsBetter: true,
    label: "Shooting accuracy",
    unit: "%",
  },
  dribbling: {
    freshman: 42,
    jv: 33,
    varsity: 25,
    higherIsBetter: false,
    label: "Cone slalom time",
    unit: "sec",
  },
  firstTouch: {
    freshman: 58,
    jv: 72,
    varsity: 87,
    higherIsBetter: true,
    label: "Clean first touches",
    unit: "%",
  },
  speed: {
    freshman: 4.7,
    jv: 4.2,
    varsity: 3.8,
    higherIsBetter: false,
    label: "20-yard sprint",
    unit: "sec",
  },
  pushups: {
    freshman: 20,
    jv: 38,
    varsity: 65,
    higherIsBetter: true,
    label: "Pushups",
    unit: "reps",
  },
  plankSeconds: {
    freshman: 90,
    jv: 210,
    varsity: 300,
    higherIsBetter: true,
    label: "Plank hold",
    unit: "sec",
  },
  wallSitSeconds: {
    freshman: 75,
    jv: 150,
    varsity: 270,
    higherIsBetter: true,
    label: "Wall sit",
    unit: "sec",
  },
};

export const foodCatalog = [
  { name: "Chicken rice bowl", portion: "1 bowl", calories: 540, protein: 38, carbs: 58, fat: 18 },
  { name: "Greek yogurt + berries", portion: "1 cup", calories: 220, protein: 16, carbs: 28, fat: 4 },
  { name: "Banana", portion: "1 medium", calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: "Peanut butter sandwich", portion: "1 sandwich", calories: 350, protein: 14, carbs: 37, fat: 18 },
  { name: "Oatmeal bowl", portion: "1 bowl", calories: 310, protein: 11, carbs: 54, fat: 5 },
  { name: "Protein shake", portion: "1 bottle", calories: 180, protein: 30, carbs: 8, fat: 3 },
] as const;

export const drillLibrary = [
  {
    name: "Wall Pass",
    focus: "Passing",
    duration: "8 min",
    equipment: "Ball + wall",
    target: "80 clean touches each foot",
    instructions:
      "Start 2 steps from the wall. Pass with the inside of the foot, receive on the first touch, and alternate feet every 10 reps.",
  },
  {
    name: "Cone Slalom",
    focus: "Dribbling",
    duration: "10 min",
    equipment: "Ball + 6 cones",
    target: "4 fast runs without losing control",
    instructions:
      "Set cones one stride apart. Use small touches on the way out and an explosive touch after each turn.",
  },
  {
    name: "First Touch Rebound",
    focus: "First touch",
    duration: "9 min",
    equipment: "Wall + ball",
    target: "6 straight clean reps per side",
    instructions:
      "Strike the wall harder than a normal pass. Cushion the rebound into space, then take the next touch forward.",
  },
  {
    name: "Shooting Ladder",
    focus: "Shooting",
    duration: "12 min",
    equipment: "Goal + ball",
    target: "At least 7 of 10 on frame",
    instructions:
      "Finish from the penalty spot, the top of the box, and a wider angle. Track placement, not power only.",
  },
  {
    name: "Recovery Sprint",
    focus: "Speed",
    duration: "8 min",
    equipment: "Open field",
    target: "6 x 20 yards with full recovery",
    instructions:
      "Drive the first three steps aggressively. Stay tall after acceleration and walk back for the recovery.",
  },
  {
    name: "Wall Sit Hold",
    focus: "Physical",
    duration: "5 min",
    equipment: "Wall",
    target: "Hold through the final minute without dropping",
    instructions:
      "Knees stacked over ankles, back flat, chest tall. Breathe through the burn and keep pressure even on both feet.",
  },
] as const;

export const coachPromptLibrary = [
  "What should I focus on today?",
  "Why is my first touch lagging?",
  "How do I get faster off the ball?",
  "Adjust my week for a game on Saturday.",
  "What should I eat after training?",
] as const;

export const blankAssessment: AssessmentState = {
  name: "Sansar",
  age: "16",
  school: "Lexington High",
  position: "Winger",
  seasonGoal: "Make varsity and stay healthy through tryouts",
  height: "5'8\"",
  weight: "154 lb",
  pushups: 30,
  plankSeconds: 150,
  wallSitSeconds: 120,
  passing: 68,
  shooting: 59,
  dribbling: 62,
  firstTouch: 64,
  speed: 67,
};

export const demoAssessment: AssessmentState = {
  name: "Sansar",
  age: "16",
  school: "Lexington High",
  position: "Right wing",
  seasonGoal: "Make varsity by tryouts",
  height: "5'9\"",
  weight: "158 lb",
  pushups: 42,
  plankSeconds: 195,
  wallSitSeconds: 165,
  passing: 74,
  shooting: 66,
  dribbling: 71,
  firstTouch: 69,
  speed: 73,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `varfoot-${Math.random().toString(36).slice(2, 10)}`;
}

function scoreMetric(metric: MetricKey, value: number) {
  const benchmark = assessmentBenchmarks[metric];
  const lower = benchmark.freshman;
  const upper = benchmark.varsity;
  if (benchmark.higherIsBetter === false) {
    return clamp(((lower - value) / (lower - upper)) * 100, 0, 100);
  }
  return clamp(((value - lower) / (upper - lower)) * 100, 0, 100);
}

export function getAssessmentScores(assessment: AssessmentState) {
  const metrics: MetricKey[] = [
    "passing",
    "shooting",
    "dribbling",
    "firstTouch",
    "speed",
    "pushups",
    "plankSeconds",
    "wallSitSeconds",
  ];

  const metricScores = metrics.map((metric) => ({
    metric,
    label: assessmentLabels[metric],
    value: assessment[metric],
    target: assessmentBenchmarks[metric].varsity,
    score: scoreMetric(metric, assessment[metric]),
    higherIsBetter: assessmentBenchmarks[metric].higherIsBetter !== false,
  }));

  const technicalScore =
    (metricScores.find((item) => item.metric === "passing")!.score +
      metricScores.find((item) => item.metric === "shooting")!.score +
      metricScores.find((item) => item.metric === "dribbling")!.score +
      metricScores.find((item) => item.metric === "firstTouch")!.score +
      metricScores.find((item) => item.metric === "speed")!.score) /
    5;

  const physicalScore =
    (metricScores.find((item) => item.metric === "pushups")!.score +
      metricScores.find((item) => item.metric === "plankSeconds")!.score +
      metricScores.find((item) => item.metric === "wallSitSeconds")!.score) /
    3;

  const overallScore = (technicalScore * 0.68 + physicalScore * 0.32);

  const gaps = metricScores
    .map((item) => ({
      ...item,
      gap: Math.max(0, item.target - item.value),
      targetLabel: formatBenchmarkTarget(item.metric),
    }))
    .sort((a, b) => b.gap - a.gap);

  return {
    metricScores,
    technicalScore,
    physicalScore,
    overallScore,
    gaps,
  };
}

export function formatBenchmarkTarget(metric: MetricKey) {
  const benchmark = assessmentBenchmarks[metric];
  const suffix = benchmark.unit === "%" ? "%" : ` ${benchmark.unit}`;
  return `${benchmark.varsity}${suffix}`;
}

export function buildTrainingPlan(assessment: AssessmentState): PlanWeek[] {
  const { gaps } = getAssessmentScores(assessment);
  const focusMetrics = gaps.slice(0, 3).map((item) => item.metric);
  const focusLabels = focusMetrics.map((metric) => assessmentLabels[metric]);
  const emphasis = focusLabels.join(" + ");

  const plan: PlanWeek[] = [
    {
      week: 1,
      label: "Reset the touch",
      emphasis: focusLabels[0] ?? "Passing",
      readinessNote: `Lay the base in ${focusLabels[0]?.toLowerCase() ?? "passing"} and clean first touches before volume climbs.`,
      sessions: [
        {
          day: "Mon",
          title: "Wall pass ladder",
          drill: "Wall Pass",
          duration: "28 min",
          focus: "Passing rhythm",
          target: "60 clean reps each foot",
          status: "today",
        },
        {
          day: "Wed",
          title: "First-touch cushion",
          drill: "First Touch Rebound",
          duration: "24 min",
          focus: "First touch",
          target: "No bobbles for 3 rounds",
          status: "queued",
        },
        {
          day: "Sat",
          title: "Low-pressure game speed",
          drill: "Cone Slalom",
          duration: "34 min",
          focus: "Control while moving",
          target: "Under 32 seconds",
          status: "queued",
        },
      ],
    },
    {
      week: 2,
      label: "Pass under pressure",
      emphasis: focusLabels[1] ?? "First touch",
      readinessNote: "Add tempo and a defender's rhythm: fewer touches, faster exits, cleaner angles.",
      sessions: [
        {
          day: "Tue",
          title: "Two-touch wall series",
          drill: "Wall Pass",
          duration: "30 min",
          focus: "One-touch decisions",
          target: "8 rounds without a bad first touch",
          status: "queued",
        },
        {
          day: "Thu",
          title: "Receive and turn",
          drill: "First Touch Rebound",
          duration: "26 min",
          focus: "Scanning before receiving",
          target: "Open hips on every rep",
          status: "queued",
        },
        {
          day: "Sat",
          title: "Pressure circuit",
          drill: "Shooting Ladder",
          duration: "32 min",
          focus: "Decision after touch",
          target: "7/10 on frame",
          status: "queued",
        },
      ],
    },
    {
      week: 3,
      label: "Beat the first defender",
      emphasis: focusLabels[2] ?? "Dribbling",
      readinessNote: "Turn the smallest gap into an advantage with tempo changes and a stronger exit touch.",
      sessions: [
        {
          day: "Mon",
          title: "Cone slalom blocks",
          drill: "Cone Slalom",
          duration: "30 min",
          focus: "Change of pace",
          target: "Four clean runs under target time",
          status: "queued",
        },
        {
          day: "Wed",
          title: "Weak-foot exits",
          drill: "Wall Pass",
          duration: "22 min",
          focus: "Weak foot control",
          target: "No favoring the strong side",
          status: "queued",
        },
        {
          day: "Fri",
          title: "Acceleration finish",
          drill: "Recovery Sprint",
          duration: "25 min",
          focus: "First three steps",
          target: "Keep every rep sharp",
          status: "queued",
        },
      ],
    },
    {
      week: 4,
      label: "Finish with intent",
      emphasis: "Shooting",
      readinessNote: "Turn touches into chances: quicker release, better body shape, cleaner placement.",
      sessions: [
        {
          day: "Tue",
          title: "Angle shooting",
          drill: "Shooting Ladder",
          duration: "34 min",
          focus: "Shot placement",
          target: "Seven of ten on frame",
          status: "queued",
        },
        {
          day: "Thu",
          title: "Touch + finish",
          drill: "First Touch Rebound",
          duration: "28 min",
          focus: "Set yourself up early",
          target: "First touch out of feet",
          status: "queued",
        },
        {
          day: "Sat",
          title: "Weak-foot finishing",
          drill: "Shooting Ladder",
          duration: "30 min",
          focus: "Confidence under fatigue",
          target: "No rush, clean contact",
          status: "queued",
        },
      ],
    },
    {
      week: 5,
      label: "Game-speed repeat",
      emphasis: "Speed",
      readinessNote: "Stack explosive work on top of control so your legs keep their shape late in sessions.",
      sessions: [
        {
          day: "Mon",
          title: "Acceleration sets",
          drill: "Recovery Sprint",
          duration: "26 min",
          focus: "Explosive starts",
          target: "Full recovery between reps",
          status: "queued",
        },
        {
          day: "Wed",
          title: "Control after sprint",
          drill: "Cone Slalom",
          duration: "28 min",
          focus: "Touch quality at speed",
          target: "Stable touches after fatigue",
          status: "queued",
        },
        {
          day: "Sat",
          title: "Match simulation",
          drill: "Wall Pass",
          duration: "36 min",
          focus: "Decision speed",
          target: "Reset instantly after errors",
          status: "queued",
        },
      ],
    },
    {
      week: 6,
      label: "Varsity checkpoint",
      emphasis: emphasis || "Varsity standards",
      readinessNote: "Pull the whole package together, then test it against the benchmark bar.",
      sessions: [
        {
          day: "Mon",
          title: "Benchmark test",
          drill: "Assessment review",
          duration: "30 min",
          focus: "Measurement",
          target: "Compare against varsity targets",
          status: "queued",
        },
        {
          day: "Wed",
          title: "Clean-up session",
          drill: "Saved drills",
          duration: "25 min",
          focus: "Small corrections",
          target: "Remove the worst gap",
          status: "queued",
        },
        {
          day: "Sat",
          title: "Tryout simulation",
          drill: "Game-speed circuit",
          duration: "38 min",
          focus: "Confidence under pressure",
          target: "Leave one thing sharper than before",
          status: "queued",
        },
      ],
    },
  ];

  return plan;
}

export function buildCoachReply(prompt: string, assessment: AssessmentState) {
  const { gaps, overallScore } = getAssessmentScores(assessment);
  const primaryGap = gaps[0];
  const focus = gaps.slice(0, 3).map((gap) => assessmentLabels[gap.metric]);
  const promptLower = prompt.toLowerCase();

  if (promptLower.includes("today")) {
    return [
      `Today should be built around ${focus[0]?.toLowerCase() ?? "passing"} and a short speed block.`,
      `Keep it simple: one technical block, one finishing block, one recovery block.`,
      `Current varsity readiness sits at ${overallScore.toFixed(0)}%. The largest gap is ${primaryGap.label.toLowerCase()} (${Math.round(primaryGap.gap)} away from varsity).`,
    ];
  }

  if (promptLower.includes("first touch")) {
    return [
      "Your first touch is close to the varsity bar, but it needs more direction and less cushion-only work.",
      "Add scanning before the receive, then send the ball into space on the first or second touch.",
      "Use the wall and one cone to force yourself to turn out of pressure after the first touch.",
    ];
  }

  if (promptLower.includes("faster") || promptLower.includes("speed")) {
    return [
      "Speed work should stay short and crisp; if the first three steps slow down, the rep is over.",
      "Pair acceleration with full recovery, then finish the session with one touch-oriented drill so the legs learn to move under control.",
      "The next speed gain will come from the first step, not from adding more volume.",
    ];
  }

  if (promptLower.includes("eat") || promptLower.includes("fuel")) {
    return [
      "After training, get carbs and protein in the same meal and keep the fiber moderate if the next session is within 12 hours.",
      "A chicken rice bowl or yogurt + fruit works well because it lands quickly and gives you both recovery and fuel.",
      "If you’re under target, add a banana or a shake rather than skipping the meal altogether.",
    ];
  }

  return [
    `The clearest focus remains ${focus.join(", ")}.`,
    `Use small touches, clean body shape, and consistent recovery between sets.`,
    `If you want, I can turn that into a lighter or harder week without losing the roadmap.`,
  ];
}

export function buildCoachSummary(prompt: string, assessment: AssessmentState) {
  return {
    answer: buildCoachReply(prompt, assessment),
    timestamp: new Date().toISOString(),
    prompt,
  };
}

export function buildPlanSummary(state: AppState) {
  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    weeks: buildTrainingPlan(state.assessment),
    summary: `Plan ready ${formatDistanceToNowStrict(new Date(generatedAt), { addSuffix: true })}.`,
  };
}

export function createBlankState(): AppState {
  return {
    onboardingComplete: false,
    activeTab: "assess",
    selectedWeek: 1,
    assessment: { ...blankAssessment },
    plan: {
      generatedAt: null,
      weeks: [],
    },
    nutrition: {
      calorieTarget: 2850,
      proteinTarget: 150,
      carbTarget: 370,
      fatTarget: 82,
      entries: [],
    },
    coach: {
      messages: [
        {
          id: makeId(),
          role: "assistant",
          text: "I’ll keep the feedback blunt, specific, and tied to your gaps. Ask what to work on, what to eat, or how to adjust a week.",
          createdAt: new Date().toISOString(),
        },
      ],
      draft: "",
    },
    library: {
      savedDrills: ["Wall Pass", "Cone Slalom"],
    },
    ui: {
      demoLoaded: false,
    },
  };
}

export function createDemoState(): AppState {
  const state = createBlankState();
  state.onboardingComplete = true;
  state.activeTab = "today";
  state.ui.demoLoaded = true;
  state.assessment = { ...demoAssessment };
  state.plan = {
    generatedAt: new Date().toISOString(),
    weeks: buildTrainingPlan(state.assessment),
  };
  state.nutrition.entries = [
    {
      id: makeId(),
      meal: "Breakfast",
      name: "Oatmeal bowl",
      portion: "1 bowl",
      calories: 310,
      protein: 11,
      carbs: 54,
      fat: 5,
    },
    {
      id: makeId(),
      meal: "Lunch",
      name: "Chicken rice bowl",
      portion: "1 bowl",
      calories: 540,
      protein: 38,
      carbs: 58,
      fat: 18,
    },
  ];
  state.coach.messages.push({
    id: makeId(),
    role: "user",
    text: "What should I focus on today?",
    createdAt: new Date().toISOString(),
  });
  const reply = buildCoachReply("What should I focus on today?", state.assessment);
  state.coach.messages.push({
    id: makeId(),
    role: "assistant",
    text: reply.join(" "),
    createdAt: new Date().toISOString(),
  });
  return state;
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

const coachMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["assistant", "user"]),
  text: z.string(),
  createdAt: z.string(),
});

const foodEntrySchema = z.object({
  id: z.string(),
  meal: z.enum(["Breakfast", "Lunch", "Snack", "Dinner"]),
  name: z.string(),
  portion: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

const planSessionSchema = z.object({
  day: z.string(),
  title: z.string(),
  drill: z.string(),
  duration: z.string(),
  focus: z.string(),
  target: z.string(),
  status: z.enum(["done", "today", "queued"]),
});

const planWeekSchema = z.object({
  week: z.number(),
  label: z.string(),
  emphasis: z.string(),
  readinessNote: z.string(),
  sessions: z.array(planSessionSchema),
});

const appStateSchema = z.object({
  onboardingComplete: z.boolean(),
  activeTab: z.enum(["today", "assess", "plan", "train", "fuel", "coach", "library", "profile"]),
  selectedWeek: z.number(),
  assessment: z.object({
    name: z.string(),
    age: z.string(),
    school: z.string(),
    position: z.string(),
    seasonGoal: z.string(),
    height: z.string(),
    weight: z.string(),
    pushups: z.number(),
    plankSeconds: z.number(),
    wallSitSeconds: z.number(),
    passing: z.number(),
    shooting: z.number(),
    dribbling: z.number(),
    firstTouch: z.number(),
    speed: z.number(),
  }),
  plan: z.object({
    generatedAt: z.string().nullable(),
    weeks: z.array(planWeekSchema),
  }),
  nutrition: z.object({
    calorieTarget: z.number(),
    proteinTarget: z.number(),
    carbTarget: z.number(),
    fatTarget: z.number(),
    entries: z.array(foodEntrySchema),
  }),
  coach: z.object({
    messages: z.array(coachMessageSchema),
    draft: z.string(),
  }),
  library: z.object({
    savedDrills: z.array(z.string()),
  }),
  ui: z.object({
    demoLoaded: z.boolean(),
  }),
});

export const nutritionTotalsSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

export function getNutritionTotals(entries: FoodEntry[]) {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      protein: totals.protein + entry.protein,
      carbs: totals.carbs + entry.carbs,
      fat: totals.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function addFoodEntry(name: string, portion: string, meal: FoodEntry["meal"]) {
  const match = foodCatalog.find((item) => item.name === name && item.portion === portion) ?? foodCatalog[0];
  return {
    id: makeId(),
    meal,
    name: match.name,
    portion: match.portion,
    calories: match.calories,
    protein: match.protein,
    carbs: match.carbs,
    fat: match.fat,
  } satisfies FoodEntry;
}

export function findMetricLabel(metric: MetricKey) {
  return assessmentLabels[metric];
}

export function formatDuration(seconds: number) {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

export function getScreenHint() {
  return `${screenMap.length} screen families mapped from the handoff`;
}

