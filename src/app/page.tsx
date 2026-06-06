"use client";

import Image from "next/image";
import {
  BookOpenText,
  BowlFood,
  ChartLineUp,
  ChatsCircle,
  ClipboardText,
  House,
  Target,
  Timer,
  UserCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addFoodEntry,
  assessmentBenchmarks,
  assessmentLabels,
  coachPromptLibrary,
  createBlankState,
  createDemoState,
  drillLibrary,
  findMetricLabel,
  getAssessmentScores,
  getNutritionTotals,
  getScreenHint,
  loadState,
  saveState,
  screenMap,
  foodCatalog,
  type AppState,
  type FoodEntry,
  type MetricKey,
  type TabKey,
} from "@/lib/varfoot";
import { hasSupabaseEnv } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const tabs: Array<{
  key: TabKey;
  label: string;
  short: string;
  icon: typeof House;
}> = [
  { key: "today", label: "Today", short: "Home", icon: House },
  { key: "assess", label: "Assess", short: "Assess", icon: ClipboardText },
  { key: "plan", label: "Plan", short: "Plan", icon: ChartLineUp },
  { key: "train", label: "Train", short: "Train", icon: Target },
  { key: "fuel", label: "Fuel", short: "Fuel", icon: BowlFood },
  { key: "coach", label: "Coach", short: "Coach", icon: ChatsCircle },
  { key: "library", label: "Library", short: "Library", icon: BookOpenText },
  { key: "profile", label: "Profile", short: "Profile", icon: UserCircle },
];

const mealSchema = z.object({
  meal: z.enum(["Breakfast", "Lunch", "Snack", "Dinner"]),
  food: z.string().min(1),
});

const coachSchema = z.object({
  prompt: z.string().min(4).max(240),
});

type MealForm = z.infer<typeof mealSchema>;
type CoachForm = z.infer<typeof coachSchema>;

function paperSection({
  eyebrow,
  title,
  summary,
  children,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  summary?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("paper-card p-4 md:p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[color:var(--foreground)] md:text-[28px]">
            {title}
          </h2>
          {summary ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--muted)] md:text-[15px]">
              {summary}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

type Tone = "neutral" | "green" | "gold" | "red" | "blue";

function valueChip({
  title,
  value,
  tone = "neutral",
}: {
  title: string;
  value: string;
  tone?: Tone;
}) {
  const toneStyles: Record<Tone, string> = {
    neutral: "border-[color:rgba(245,236,216,0.12)] bg-[rgba(40,40,31,0.96)] text-[color:var(--muted)]",
    green:
      "border-[color:rgba(132,181,109,0.38)] bg-[rgba(132,181,109,0.16)] text-[color:var(--green)]",
    gold:
      "border-[color:rgba(210,160,74,0.42)] bg-[rgba(210,160,74,0.15)] text-[color:var(--gold)]",
    red: "border-[color:rgba(215,121,109,0.36)] bg-[rgba(215,121,109,0.12)] text-[color:var(--red)]",
    blue: "border-[color:rgba(134,178,199,0.34)] bg-[rgba(134,178,199,0.12)] text-[color:var(--blue)]",
  };

  return (
    <div className={cn("rounded-[16px] border px-3 py-2 shadow-[2px_2px_0_rgba(0,0,0,0.16)]", toneStyles[tone])}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">{title}</p>
      <p className="mt-1 text-lg font-black tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function progressRow({
  label,
  current,
  freshman,
  jv,
  varsity,
  invert = false,
}: {
  label: string;
  current: number;
  freshman: number;
  jv: number;
  varsity: number;
  invert?: boolean;
}) {
  const upper = invert ? freshman : varsity;
  const lower = invert ? varsity : freshman;
  const currentPct = invert
    ? ((lower - current) / (lower - upper)) * 100
    : ((current - lower) / (upper - lower)) * 100;

  const markers = [freshman, jv, varsity];
  return (
    <div className="rounded-[18px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.95)] p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold tracking-[-0.02em] text-[color:var(--foreground)]">{label}</span>
        <span className="font-mono text-[13px] text-[color:var(--green)]">
          {typeof current === "number" ? current.toFixed(current < 10 ? 2 : 0) : current}
        </span>
      </div>
      <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-[rgba(245,236,216,0.07)]">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[linear-gradient(90deg,var(--green),#a7c98f)]"
          style={{ width: `${Math.max(6, Math.min(100, currentPct))}%` }}
        />
        {markers.map((marker, index) => {
          const pct = invert
            ? ((lower - marker) / (lower - upper)) * 100
            : ((marker - lower) / (upper - lower)) * 100;
          return (
            <span
              key={index}
              className="absolute top-[-4px] h-5 w-[2px] rounded-full bg-[rgba(245,236,216,0.42)]"
              style={{ left: `${Math.max(0, Math.min(100, pct))}%` }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--dim)]">
        <span>Freshman</span>
        <span>JV</span>
        <span>Varsity</span>
      </div>
    </div>
  );
}

function navButton({
  tab,
  active,
  onClick,
}: {
  tab: (typeof tabs)[number];
  active: boolean;
  onClick: (tab: TabKey) => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={() => onClick(tab.key)}
      className={cn(
        "flex w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition duration-200",
        active
          ? "border-[color:rgba(245,236,216,0.14)] bg-[var(--foreground)] text-[color:#11120e] shadow-[2px_3px_0_rgba(0,0,0,0.22)]"
          : "border-[color:rgba(245,236,216,0.08)] bg-[rgba(36,37,28,0.96)] text-[color:var(--muted)] hover:border-[color:rgba(132,181,109,0.34)] hover:text-[color:var(--foreground)]",
      )}
    >
      <Icon size={19} weight="bold" />
      <span className="flex-1 text-sm font-black tracking-[-0.02em]">{tab.label}</span>
      <span
        className={cn(
          "rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em]",
          active ? "bg-[rgba(17,18,14,0.12)]" : "bg-[rgba(245,236,216,0.08)]",
        )}
      >
        {tab.short}
      </span>
    </button>
  );
}

function Gauge({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(100, score));
  return (
    <div className="relative flex aspect-square w-full max-w-[240px] items-center justify-center rounded-full border border-[color:rgba(245,236,216,0.12)] bg-[radial-gradient(circle_at_50%_40%,rgba(132,181,109,0.14),rgba(36,37,28,0.98)_60%)] shadow-[0_0_0_1px_rgba(0,0,0,0.22)_inset]">
      <div
        className="absolute inset-3 rounded-full"
        style={{
          background: `conic-gradient(var(--green) 0 ${safeScore}%, rgba(245,236,216,0.08) ${safeScore}% 100%)`,
        }}
      />
      <div className="absolute inset-7 rounded-full border border-[color:rgba(245,236,216,0.08)] bg-[rgba(12,13,10,0.9)]" />
      <div className="relative z-10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--muted)]">
          Varsity readiness
        </p>
        <p className="mt-1 text-5xl font-black tracking-[-0.07em] text-[color:var(--foreground)]">
          {safeScore}
        </p>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-[color:var(--green)]">
          out of 100
        </p>
      </div>
    </div>
  );
}

function MealLogger({
  onAddMeal,
}: {
  onAddMeal: (meal: FoodEntry["meal"], foodName: string) => void;
}) {
  const form = useForm<MealForm>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      meal: "Breakfast",
      food: foodCatalog[0]?.name ?? "",
    },
  });

  return (
    <form
      className="grid gap-3 rounded-[22px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] p-4"
      onSubmit={form.handleSubmit((values) => {
        onAddMeal(values.meal, values.food);
        form.reset({ meal: values.meal, food: values.food });
      })}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-2 text-sm font-bold text-[color:var(--muted)]">
          Meal
          <select className="paper-field px-3 py-3 text-sm" {...form.register("meal")}>
            <option>Breakfast</option>
            <option>Lunch</option>
            <option>Snack</option>
            <option>Dinner</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[color:var(--muted)]">
          Food
          <select className="paper-field px-3 py-3 text-sm" {...form.register("food")}>
            {foodCatalog.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="paper-button-primary inline-flex h-12 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em] transition duration-200"
          >
            Add meal
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {foodCatalog.slice(0, 4).map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => form.setValue("food", item.name)}
            className="paper-chip rounded-full px-3 py-2 text-xs font-black transition hover:border-[color:rgba(132,181,109,0.34)] hover:text-[color:var(--foreground)]"
          >
            {item.name}
          </button>
        ))}
      </div>
    </form>
  );
}

function CoachComposer({
  defaultPrompt,
  onSend,
  busy,
}: {
  defaultPrompt: string;
  onSend: (prompt: string) => void;
  busy: boolean;
}) {
  const form = useForm<CoachForm>({
    resolver: zodResolver(coachSchema),
    defaultValues: { prompt: defaultPrompt },
  });

  useEffect(() => {
    form.reset({ prompt: defaultPrompt });
  }, [defaultPrompt, form]);

  return (
    <form
      className="grid gap-3 rounded-[22px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] p-4"
      onSubmit={form.handleSubmit((values) => {
        onSend(values.prompt);
        form.reset({ prompt: "" });
      })}
    >
      <label className="grid gap-2 text-sm font-bold text-[color:var(--muted)]">
        Ask VarFoot
        <textarea
          className="paper-field min-h-[110px] resize-y px-4 py-3 text-sm leading-6"
          placeholder="What should I work on today?"
          {...form.register("prompt")}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {coachPromptLibrary.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => form.setValue("prompt", prompt)}
            className="paper-chip rounded-full px-3 py-2 text-xs font-black transition hover:border-[color:rgba(210,160,74,0.35)] hover:text-[color:var(--foreground)]"
          >
            {prompt}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[color:var(--dim)]">
          VarFoot keeps replies specific to your gaps, plan, and intake.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="paper-button-primary inline-flex h-11 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em] transition duration-200 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? "Thinking..." : "Send"}
        </button>
      </div>
    </form>
  );
}

function MetricField({
  label,
  value,
  onChange,
  suffix,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[color:var(--muted)]">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {suffix ? <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--dim)]">{suffix}</span> : null}
      </span>
      <input
        className="paper-field h-12 px-4 text-sm font-semibold tracking-[-0.01em]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <span className="text-xs font-medium text-[color:var(--dim)]">{hint}</span> : null}
    </label>
  );
}

function App() {
  const [state, setState] = useState<AppState>(() =>
    typeof window !== "undefined" ? loadState() : createBlankState(),
  );
  const [planLoading, setPlanLoading] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const scores = useMemo(() => getAssessmentScores(state.assessment), [state.assessment]);
  const nutritionTotals = useMemo(() => getNutritionTotals(state.nutrition.entries), [state.nutrition.entries]);
  const selectedWeek = state.plan.weeks.find((week) => week.week === state.selectedWeek) ?? state.plan.weeks[0];
  const topGaps = scores.gaps.slice(0, 3);
  const currentTime = new Date();
  const localMode = !hasSupabaseEnv();

  function patchState(updater: (prev: AppState) => AppState) {
    setState(updater);
  }

  function updateAssessment(key: keyof AppState["assessment"], value: string) {
    patchState((prev) => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        [key]:
          key === "name" ||
          key === "age" ||
          key === "school" ||
          key === "position" ||
          key === "seasonGoal" ||
          key === "height" ||
          key === "weight"
            ? value
            : Number(value),
      },
    }));
  }

  async function generatePlan() {
    setPlanLoading(true);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const payload = (await response.json()) as {
        generatedAt: string;
        weeks: AppState["plan"]["weeks"];
        summary: string;
      };

      patchState((prev) => ({
        ...prev,
        onboardingComplete: true,
        activeTab: "today",
        selectedWeek: 1,
        plan: {
          generatedAt: payload.generatedAt,
          weeks: payload.weeks,
        },
      }));
    } finally {
      setPlanLoading(false);
    }
  }

  async function sendCoach(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }

    setCoachLoading(true);
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    patchState((prev) => ({
      ...prev,
      coach: {
        ...prev.coach,
        draft: trimmed,
        messages: [...prev.coach.messages, userMessage],
      },
    }));

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, state }),
      });
      const payload = (await response.json()) as {
        answer: string[];
        timestamp: string;
      };

      patchState((prev) => ({
        ...prev,
        coach: {
          ...prev.coach,
          draft: "",
          messages: [
            ...prev.coach.messages,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              text: payload.answer.join(" "),
              createdAt: payload.timestamp,
            },
          ],
        },
      }));
    } finally {
      setCoachLoading(false);
    }
  }

  function addMeal(meal: FoodEntry["meal"], foodName: string) {
    const match = foodCatalog.find((item) => item.name === foodName) ?? foodCatalog[0];
    if (!match) {
      return;
    }

    patchState((prev) => ({
      ...prev,
      nutrition: {
        ...prev.nutrition,
        entries: [addFoodEntry(match.name, match.portion, meal), ...prev.nutrition.entries],
      },
    }));
  }

  function toggleDrill(name: string) {
    patchState((prev) => {
      const alreadySaved = prev.library.savedDrills.includes(name);
      return {
        ...prev,
        library: {
          ...prev.library,
          savedDrills: alreadySaved
            ? prev.library.savedDrills.filter((drill) => drill !== name)
            : [name, ...prev.library.savedDrills],
        },
      };
    });
  }

  function loadDemo() {
    setState(createDemoState());
  }

  function resetState() {
    setState(createBlankState());
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("varfoot.app-state");
    }
  }

  const fuelStatus =
    nutritionTotals.calories >= state.nutrition.calorieTarget * 0.85
      ? "green"
      : nutritionTotals.calories >= state.nutrition.calorieTarget * 0.65
        ? "gold"
        : "red";

  const nextSession = selectedWeek?.sessions.find((session) => session.status === "today") ?? selectedWeek?.sessions[0];

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="noise-layer" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 md:px-6 lg:py-6">
        <header className="paper-shell rounded-[28px] px-5 py-4 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] shadow-[3px_4px_0_rgba(0,0,0,0.18)]">
                <Image src="/varfoot-mark.svg" alt="VarFoot mark" width={40} height={40} priority />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[color:var(--green)]">
                  VarFoot
                </p>
                <h1 className="text-3xl font-black tracking-[-0.05em] text-[color:var(--foreground)] md:text-[38px]">
                  From assessment to varsity roadmap.
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--muted)] md:text-[15px]">
                  A mobile-first training journal that turns drill results, benchmarks, nutrition, and coach
                  feedback into one week-by-week plan.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[430px]">
              {valueChip({
                title: "Screen families",
                value: `${screenMap.length}`,
                tone: "gold",
              })}
              {valueChip({
                title: "Sync mode",
                value: localMode ? "Demo" : "Supabase",
                tone: localMode ? "red" : "green",
              })}
              {valueChip({
                title: "Last saved",
                value: "Local cache",
                tone: "blue",
              })}
            </div>
          </div>
        </header>

        <main className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="paper-shell rounded-[28px] p-4 md:p-5 xl:sticky xl:top-6 xl:h-fit">
            <div className="paper-card-soft p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
                Current player
              </p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)]">
                  <span className="text-xl font-black tracking-[-0.04em] text-[color:var(--foreground)]">
                    {state.assessment.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black tracking-[-0.04em]">{state.assessment.name}</h2>
                  <p className="text-sm text-[color:var(--muted)]">{state.assessment.school}</p>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--dim)]">
                    {state.assessment.position}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Gauge score={Math.round(scores.overallScore)} />
              </div>

              <div className="mt-4 grid gap-2">
                {valueChip({
                  title: "Goal",
                  value: state.assessment.seasonGoal,
                  tone: "neutral",
                })}
                {valueChip({
                  title: "Best gap",
                  value: `${findMetricLabel((topGaps[0]?.metric ?? "passing") as MetricKey)}`,
                  tone: "green",
                })}
              </div>
            </div>

            <nav className="mt-4 grid gap-2">
              {tabs.map((tab) => navButton({ tab, active: tab.key === state.activeTab, onClick: (key) => patchState((prev) => ({ ...prev, activeTab: key })) }))}
            </nav>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={loadDemo}
                className="paper-button-primary inline-flex h-12 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em] transition duration-200"
              >
                Load demo athlete
              </button>
              <button
                type="button"
                onClick={resetState}
                className="paper-button-secondary inline-flex h-12 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em] transition duration-200"
              >
                Clear local data
              </button>
            </div>

            <div className="mt-4 grid gap-2 text-sm">
              <div className="rounded-[18px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--dim)]">Last update</p>
                <p className="mt-1 font-bold text-[color:var(--foreground)]">
                  {currentTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              <div className="rounded-[18px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--dim)]">Mapped screens</p>
                <p className="mt-1 font-bold text-[color:var(--foreground)]">{getScreenHint()}</p>
              </div>
            </div>
          </aside>

          <div className="grid gap-5">
            {state.onboardingComplete ? null : (
              <section className="paper-card p-4 md:p-5">
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[24px] border border-[color:rgba(245,236,216,0.12)] bg-[linear-gradient(180deg,rgba(132,181,109,0.13),rgba(24,25,18,0.98))] p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
                      Launch / Welcome
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] md:text-4xl">
                      Build the plan before the next tryout window opens.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)] md:text-[15px]">
                      Start with your physical baseline, then compare against varsity targets and let the roadmap
                      adjust itself around the biggest gaps.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => patchState((prev) => ({ ...prev, activeTab: "assess" }))}
                        className="paper-button-primary inline-flex h-11 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em]"
                      >
                        Start assessment
                      </button>
                      <button
                        type="button"
                        onClick={loadDemo}
                        className="paper-button-secondary inline-flex h-11 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em]"
                      >
                        Load demo athlete
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="paper-card-soft p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">
                        Handoff map
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {screenMap.slice(0, 6).map((screen) => (
                          <div
                            key={screen}
                            className="rounded-[16px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] px-3 py-2 text-xs font-bold text-[color:var(--foreground)]"
                          >
                            {screen}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {valueChip({ title: "Assessment", value: "Physical + technical", tone: "green" })}
                      {valueChip({ title: "Plan", value: "6-week roadmap", tone: "gold" })}
                      {valueChip({ title: "Data", value: "Local cache", tone: "blue" })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {state.activeTab === "today" ? (
              <TodayTab
                state={state}
                scores={scores}
                nutritionTotals={nutritionTotals}
                nextSession={nextSession}
                topGaps={topGaps}
                selectedWeek={selectedWeek}
                onGeneratePlan={generatePlan}
                planLoading={planLoading}
              />
            ) : null}

            {state.activeTab === "assess" ? (
              <AssessTab
                state={state}
                scores={scores}
                onAssessmentChange={updateAssessment}
                onGeneratePlan={generatePlan}
                planLoading={planLoading}
              />
            ) : null}

            {state.activeTab === "plan" ? (
              <PlanTab
                state={state}
                selectedWeek={selectedWeek}
                onSelectWeek={(week) => patchState((prev) => ({ ...prev, selectedWeek: week }))}
                onGeneratePlan={generatePlan}
                planLoading={planLoading}
              />
            ) : null}

            {state.activeTab === "train" ? (
              <TrainTab
                state={state}
                onToggleDrill={toggleDrill}
              />
            ) : null}

            {state.activeTab === "fuel" ? (
              <FuelTab
                state={state}
                totals={nutritionTotals}
                fuelStatus={fuelStatus}
                onAddMeal={addMeal}
              />
            ) : null}

            {state.activeTab === "coach" ? (
              <CoachTab
                state={state}
                scores={scores}
                onSend={sendCoach}
                busy={coachLoading}
              />
            ) : null}

            {state.activeTab === "library" ? (
              <LibraryTab
                state={state}
                onToggleDrill={toggleDrill}
              />
            ) : null}

            {state.activeTab === "profile" ? (
              <ProfileTab
                state={state}
                scores={scores}
                onAssessmentChange={updateAssessment}
                onLoadDemo={loadDemo}
                onReset={resetState}
                localMode={localMode}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function TodayTab({
  state,
  scores,
  nutritionTotals,
  nextSession,
  topGaps,
  selectedWeek,
  onGeneratePlan,
  planLoading,
}: {
  state: AppState;
  scores: ReturnType<typeof getAssessmentScores>;
  nutritionTotals: ReturnType<typeof getNutritionTotals>;
  nextSession?: AppState["plan"]["weeks"][number]["sessions"][number];
  topGaps: ReturnType<typeof getAssessmentScores>["gaps"];
  selectedWeek?: AppState["plan"]["weeks"][number];
  onGeneratePlan: () => void;
  planLoading: boolean;
}) {
  const focusCopy = topGaps.slice(0, 2).map((item) => item.label).join(" · ");

  return (
    <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      {paperSection({
        eyebrow: "Dashboard Overview",
        title: "What changed, what matters, what to do next.",
        summary:
          "The dashboard keeps the morning briefing short: one readiness score, the next session, the biggest gap, and fuel status.",
        action: (
          <button
            type="button"
            onClick={onGeneratePlan}
            disabled={planLoading}
            className="paper-button-primary inline-flex h-11 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em] disabled:cursor-wait disabled:opacity-70"
          >
            {planLoading ? "Generating..." : "Regenerate plan"}
          </button>
        ),
        children: (
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-3">
                {valueChip({ title: "Readiness", value: `${Math.round(scores.overallScore)} / 100`, tone: "green" })}
                {valueChip({
                  title: "Current focus",
                  value: focusCopy || "Passing and first touch",
                  tone: "gold",
                })}
                {valueChip({
                  title: "Plan week",
                  value: selectedWeek ? `Week ${selectedWeek.week} · ${selectedWeek.label}` : "Not generated",
                  tone: "blue",
                })}
              </div>

              <div className="grid gap-3">
                <div className="paper-card-soft p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">Next session</p>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black tracking-[-0.05em] text-[color:var(--foreground)]">
                        {nextSession?.title ?? "Generate your first week"}
                      </h3>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">
                        {nextSession?.drill ?? "The roadmap will pick this up after the first assessment."}
                      </p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(132,181,109,0.16)]">
                      <Timer size={26} weight="bold" className="text-[color:var(--green)]" />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {nextSession ? (
                      <>
                        {valueChip({ title: "Day", value: nextSession.day, tone: "green" })}
                        {valueChip({ title: "Duration", value: nextSession.duration, tone: "neutral" })}
                        {valueChip({ title: "Target", value: nextSession.target, tone: "gold" })}
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="paper-card-soft p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">Nutrition</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {valueChip({
                      title: "Calories",
                      value: `${nutritionTotals.calories} / ${state.nutrition.calorieTarget}`,
                      tone: nutritionTotals.calories >= state.nutrition.calorieTarget * 0.85 ? "green" : "gold",
                    })}
                    {valueChip({
                      title: "Protein",
                      value: `${nutritionTotals.protein} g / ${state.nutrition.proteinTarget} g`,
                      tone: nutritionTotals.protein >= state.nutrition.proteinTarget * 0.7 ? "green" : "red",
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {scores.gaps.slice(0, 3).map((gap) => (
                <div key={gap.metric} className="paper-card-soft p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">
                    {assessmentLabels[gap.metric]}
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.06em] text-[color:var(--foreground)]">
                    {Math.round(gap.score)}%
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    {gap.higherIsBetter ? "Need more clean reps" : "Lower is better here"}.
                  </p>
                </div>
              ))}
            </div>
          </div>
        ),
      })}

      {paperSection({
        eyebrow: "Benchmark Summary",
        title: "Freshman, JV, varsity.",
        summary: "The same bar applies across the board. The table below shows where the current athlete sits.",
        children: (
          <div className="grid gap-3">
            {(
              [
                "passing",
                "shooting",
                "dribbling",
                "firstTouch",
                "speed",
                "pushups",
                "plankSeconds",
                "wallSitSeconds",
              ] as MetricKey[]
            ).map((metric) => (
              <div key={metric} className="grid gap-2">
                {progressRow({
                  label: assessmentLabels[metric],
                  current: state.assessment[metric],
                  freshman: assessmentBenchmarks[metric].freshman,
                  jv: assessmentBenchmarks[metric].jv,
                  varsity: assessmentBenchmarks[metric].varsity,
                  invert: assessmentBenchmarks[metric].higherIsBetter === false,
                })}
              </div>
            ))}
          </div>
        ),
      })}
    </div>
  );
}

function AssessTab({
  state,
  scores,
  onAssessmentChange,
  onGeneratePlan,
  planLoading,
}: {
  state: AppState;
  scores: ReturnType<typeof getAssessmentScores>;
  onAssessmentChange: (key: keyof AppState["assessment"], value: string) => void;
  onGeneratePlan: () => void;
  planLoading: boolean;
}) {
  const physicalMetrics: Array<keyof Pick<AppState["assessment"], "height" | "weight" | "pushups" | "plankSeconds" | "wallSitSeconds">> = [
    "height",
    "weight",
    "pushups",
    "plankSeconds",
    "wallSitSeconds",
  ];

  const technicalMetrics: Array<keyof Pick<
    AppState["assessment"],
    "passing" | "shooting" | "dribbling" | "firstTouch" | "speed"
  >> = ["passing", "shooting", "dribbling", "firstTouch", "speed"];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      {paperSection({
        eyebrow: "Assessment Hub",
        title: "Set the baseline once, then let the roadmap do the work.",
        summary:
          "The physical questions come straight from the PDF handout. The technical inputs mirror the handoff screens and feed the weekly plan.",
        action: (
          <button
            type="button"
            onClick={onGeneratePlan}
            disabled={planLoading}
            className="paper-button-primary inline-flex h-11 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em] disabled:cursor-wait disabled:opacity-70"
          >
            {planLoading ? "Generating..." : "Generate varsity plan"}
          </button>
        ),
        children: (
          <div className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="grid gap-3">
                <div className="rounded-[24px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
                    Profile setup
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <MetricField
                      label="Name"
                      value={state.assessment.name}
                      onChange={(value) => onAssessmentChange("name", value)}
                    />
                    <MetricField label="Age" value={state.assessment.age} onChange={(value) => onAssessmentChange("age", value)} />
                    <MetricField
                      label="School"
                      value={state.assessment.school}
                      onChange={(value) => onAssessmentChange("school", value)}
                    />
                    <MetricField
                      label="Position"
                      value={state.assessment.position}
                      onChange={(value) => onAssessmentChange("position", value)}
                    />
                    <label className="md:col-span-2 grid gap-2 text-sm font-bold text-[color:var(--muted)]">
                      <span>Season goal</span>
                      <input
                        className="paper-field h-12 px-4 text-sm font-semibold tracking-[-0.01em]"
                        value={state.assessment.seasonGoal}
                        onChange={(event) => onAssessmentChange("seasonGoal", event.target.value)}
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
                    Physical questions
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    These match the PDF: height/weight, pushups, plank, and wall sit.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {physicalMetrics.map((metric) => {
                      const isText = metric === "height" || metric === "weight";
                      return (
                        <MetricField
                          key={metric}
                          label={findMetricLabel(metric as MetricKey)}
                          value={state.assessment[metric]}
                          onChange={(value) => onAssessmentChange(metric, value)}
                          suffix={isText ? "Reference" : "Seconds / reps"}
                          hint={
                            metric === "pushups"
                              ? "PDF benchmark target: 65 pushups"
                              : metric === "plankSeconds"
                                ? "PDF benchmark target: 5 minute plank"
                                : metric === "wallSitSeconds"
                                  ? "PDF benchmark target: 4.5 minute wall sit"
                                  : undefined
                          }
                        />
                      );
                    })}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Image
                      src="/drill-source/page-1.png"
                      alt="PDF physical assessment page 1"
                      width={900}
                      height={1100}
                      className="w-full rounded-[20px] border border-[color:rgba(245,236,216,0.12)] object-cover"
                    />
                    <Image
                      src="/drill-source/page-2.png"
                      alt="PDF physical assessment page 2"
                      width={900}
                      height={1100}
                      className="w-full rounded-[20px] border border-[color:rgba(245,236,216,0.12)] object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[24px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
                    Technical inputs
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    Each value is compared to the freshman / JV / varsity targets.
                  </p>
                  <div className="mt-4 grid gap-3">
                    {technicalMetrics.map((metric) => {
                      const benchmark = assessmentBenchmarks[metric];
                      return (
                        <MetricField
                          key={metric}
                          label={assessmentLabels[metric]}
                          value={state.assessment[metric]}
                          onChange={(value) => onAssessmentChange(metric, value)}
                          suffix={benchmark.higherIsBetter === false ? "Lower is better" : "Higher is better"}
                          hint={`Freshman ${benchmark.freshman}${benchmark.unit === "%" ? "%" : ` ${benchmark.unit}`} · JV ${benchmark.jv}${benchmark.unit === "%" ? "%" : ` ${benchmark.unit}`} · Varsity ${benchmark.varsity}${benchmark.unit === "%" ? "%" : ` ${benchmark.unit}`}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
                    Assessment review
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {valueChip({
                      title: "Technical",
                      value: `${Math.round(scores.technicalScore)}%`,
                      tone: "green",
                    })}
                    {valueChip({
                      title: "Physical",
                      value: `${Math.round(scores.physicalScore)}%`,
                      tone: "gold",
                    })}
                    {valueChip({
                      title: "Overall",
                      value: `${Math.round(scores.overallScore)}%`,
                      tone: "blue",
                    })}
                  </div>
                  <div className="mt-4 rounded-[20px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-4">
                    <p className="text-sm font-bold text-[color:var(--foreground)]">
                      Biggest gap: {assessmentLabels[scores.gaps[0]?.metric ?? "passing"]} needs the most work.
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                      Use this as the first block in the weekly plan. Everything else can sit behind it without
                      changing the top priority.
                    </p>
                  </div>
                </div>

                <div className="paper-card-soft p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">Target bar</p>
                  <div className="mt-3 grid gap-2">
                    {topGapRows(scores).map((item) => (
                      <div key={item.metric} className="rounded-[16px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-bold text-[color:var(--foreground)]">{item.label}</span>
                          <span className="font-mono text-[color:var(--green)]">{item.currentLabel}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(245,236,216,0.08)]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,var(--green),#d2a04a)]"
                            style={{ width: `${Math.max(8, item.score)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-[color:var(--muted)]">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
      })}
    </div>
  );
}

function topGapRows(scores: ReturnType<typeof getAssessmentScores>) {
  return scores.gaps.slice(0, 3).map((gap) => ({
    metric: gap.metric,
    label: gap.label,
    currentLabel: `${typeof gap.value === "number" ? gap.value : String(gap.value)}${assessmentBenchmarks[gap.metric].unit === "%" ? "%" : ` ${assessmentBenchmarks[gap.metric].unit}`}`,
    score: gap.score,
    note: gap.higherIsBetter
      ? `${gap.gap.toFixed(0)} more clean reps needed to reach varsity.`
      : `${gap.gap.toFixed(2)} seconds to trim before it reaches varsity pace.`,
  }));
}

function PlanTab({
  state,
  selectedWeek,
  onSelectWeek,
  onGeneratePlan,
  planLoading,
}: {
  state: AppState;
  selectedWeek?: AppState["plan"]["weeks"][number];
  onSelectWeek: (week: number) => void;
  onGeneratePlan: () => void;
  planLoading: boolean;
}) {
  return paperSection({
    eyebrow: "Plan Roadmap",
    title: "Week-by-week work, not random workouts.",
    summary:
      "The plan repeats the same logic the handoff shows: a roadmap, a week overview, then a session detail with clear targets.",
    action: (
      <button
        type="button"
        onClick={onGeneratePlan}
        disabled={planLoading}
        className="paper-button-primary inline-flex h-11 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em] disabled:cursor-wait disabled:opacity-70"
      >
        {planLoading ? "Generating..." : state.plan.weeks.length ? "Regenerate" : "Generate"}
      </button>
    ),
    children: (
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {state.plan.weeks.length ? (
            state.plan.weeks.map((week) => (
              <button
                key={week.week}
                type="button"
                onClick={() => onSelectWeek(week.week)}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition",
                  state.selectedWeek === week.week
                    ? "paper-chip-active"
                    : "paper-chip hover:border-[color:rgba(132,181,109,0.34)] hover:text-[color:var(--foreground)]",
                )}
              >
                Week {week.week}
              </button>
            ))
          ) : (
            <p className="text-sm text-[color:var(--muted)]">
              No roadmap yet. Generate the plan after finishing the assessment.
            </p>
          )}
        </div>

        {selectedWeek ? (
          <div className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
            <div className="rounded-[24px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
                Week overview
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[color:var(--foreground)]">
                Week {selectedWeek.week} · {selectedWeek.label}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{selectedWeek.readinessNote}</p>
              <div className="mt-4 grid gap-2">
                {valueChip({ title: "Focus", value: selectedWeek.emphasis, tone: "green" })}
                {valueChip({
                  title: "Progress",
                  value: `${selectedWeek.sessions.filter((session) => session.status === "done").length}/${selectedWeek.sessions.length} sessions`,
                  tone: "gold",
                })}
              </div>
              <div className="mt-4 rounded-[20px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--dim)]">Session flow</p>
                <div className="mt-3 grid gap-2">
                  {selectedWeek.sessions.map((session) => (
                    <div
                      key={session.day}
                      className={cn(
                        "rounded-[16px] border px-3 py-3",
                        session.status === "today"
                          ? "border-[color:rgba(132,181,109,0.36)] bg-[rgba(132,181,109,0.13)]"
                          : "border-[color:rgba(245,236,216,0.1)] bg-[rgba(24,25,18,0.86)]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--dim)]">
                            {session.day}
                          </p>
                          <p className="mt-1 text-sm font-bold text-[color:var(--foreground)]">{session.title}</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--green)]">
                          {session.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[color:var(--muted)]">
                        {session.drill} · {session.duration}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
                Session detail
              </p>
              <div className="mt-4 grid gap-3">
                {selectedWeek.sessions.map((session) => (
                  <div key={session.day} className="rounded-[20px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">
                          {session.day}
                        </p>
                        <h4 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[color:var(--foreground)]">
                          {session.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Timer size={18} weight="bold" className="text-[color:var(--green)]" />
                        <span className="text-sm font-black text-[color:var(--green)]">{session.duration}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                      Drill: <span className="font-bold text-[color:var(--foreground)]">{session.drill}</span>
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                      Focus: <span className="font-bold text-[color:var(--foreground)]">{session.focus}</span>
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                      Target: <span className="font-bold text-[color:var(--foreground)]">{session.target}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    ),
  });
}

function TrainTab({
  state,
  onToggleDrill,
}: {
  state: AppState;
  onToggleDrill: (name: string) => void;
}) {
  const [selectedDrill, setSelectedDrill] = useState<(typeof drillLibrary)[number]["name"]>(drillLibrary[0].name);
  const activeDrill = drillLibrary.find((drill) => drill.name === selectedDrill) ?? drillLibrary[0];

  return paperSection({
    eyebrow: "Drill Library + Content",
    title: "Keep the library small and repeat the useful drills.",
    summary:
      "The handoff calls for a drill library, a drill detail screen, and saved drills. This tab keeps all three in one place.",
    children: (
      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="grid gap-3">
          {drillLibrary.map((drill) => {
            const saved = state.library.savedDrills.includes(drill.name);
            return (
              <button
                key={drill.name}
                type="button"
                onClick={() => setSelectedDrill(drill.name)}
                className={cn(
                  "rounded-[22px] border p-4 text-left transition",
                  selectedDrill === drill.name
                    ? "border-[color:rgba(132,181,109,0.38)] bg-[rgba(132,181,109,0.13)] shadow-[3px_3px_0_rgba(0,0,0,0.22)]"
                    : "border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] hover:border-[color:rgba(132,181,109,0.28)]",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">{drill.focus}</p>
                    <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[color:var(--foreground)]">
                      {drill.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleDrill(drill.name);
                    }}
                    className={cn(
                      "rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]",
                      saved ? "paper-chip-active" : "paper-chip",
                    )}
                  >
                    {saved ? "Saved" : "Save"}
                  </button>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{drill.instructions}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {valueChip({ title: "Time", value: drill.duration, tone: "blue" })}
                  {valueChip({ title: "Target", value: drill.target, tone: "gold" })}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3">
          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
              Drill detail
            </p>
            <h3 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[color:var(--foreground)]">
              {activeDrill.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{activeDrill.instructions}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {valueChip({ title: "Focus", value: activeDrill.focus, tone: "green" })}
              {valueChip({ title: "Time", value: activeDrill.duration, tone: "blue" })}
              {valueChip({ title: "Target", value: activeDrill.target, tone: "gold" })}
            </div>
          </div>

          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">Saved drills</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {state.library.savedDrills.length ? (
                state.library.savedDrills.map((drill) => (
                  <span
                    key={drill}
                    className="paper-chip rounded-full px-3 py-2 text-xs font-black"
                  >
                    {drill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-[color:var(--muted)]">Tap Save on any drill to pin it here.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
  });
}

function FuelTab({
  state,
  totals,
  fuelStatus,
  onAddMeal,
}: {
  state: AppState;
  totals: ReturnType<typeof getNutritionTotals>;
  fuelStatus: "green" | "gold" | "red";
  onAddMeal: (meal: FoodEntry["meal"], foodName: string) => void;
}) {
  return paperSection({
    eyebrow: "Nutrition",
    title: "Track food by ingredient and let the macros add up automatically.",
    summary:
      "The logger uses a simple portion-based catalog so the athlete can get the numbers without opening a spreadsheet.",
    children: (
      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="grid gap-3">
          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">Macro goals</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {valueChip({
                title: "Calories",
                value: `${totals.calories} / ${state.nutrition.calorieTarget}`,
                tone: fuelStatus,
              })}
              {valueChip({
                title: "Protein",
                value: `${totals.protein} / ${state.nutrition.proteinTarget} g`,
                tone: totals.protein >= state.nutrition.proteinTarget * 0.7 ? "green" : "red",
              })}
              {valueChip({
                title: "Carbs",
                value: `${totals.carbs} / ${state.nutrition.carbTarget} g`,
                tone: "blue",
              })}
              {valueChip({
                title: "Fat",
                value: `${totals.fat} / ${state.nutrition.fatTarget} g`,
                tone: "gold",
              })}
            </div>
            <div className="mt-4 rounded-[20px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-4">
              <p className="text-sm font-bold text-[color:var(--foreground)]">
                {fuelStatus === "green"
                  ? "Fuel is in range."
                  : fuelStatus === "gold"
                    ? "Close to target. One meal or shake should cover the gap."
                    : "Under target. Add carbs and protein before the next session."}
              </p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                The app keeps the tone factual: enough energy for the next session, enough protein for recovery,
                and enough carbs to keep the legs moving.
              </p>
            </div>
          </div>

          <MealLogger onAddMeal={onAddMeal} />
        </div>

        <div className="grid gap-3">
          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
              Food log
            </p>
            <div className="mt-3 grid gap-2">
              {state.nutrition.entries.length ? (
                state.nutrition.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[18px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--dim)]">
                          {entry.meal}
                        </p>
                        <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[color:var(--foreground)]">
                          {entry.name}
                        </h3>
                        <p className="text-sm text-[color:var(--muted)]">{entry.portion}</p>
                      </div>
                      <div className="rounded-[16px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(132,181,109,0.12)] px-3 py-2 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--green)]">
                          Calories
                        </p>
                        <p className="text-xl font-black text-[color:var(--foreground)]">{entry.calories}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      {valueChip({ title: "Protein", value: `${entry.protein} g`, tone: "green" })}
                      {valueChip({ title: "Carbs", value: `${entry.carbs} g`, tone: "blue" })}
                      {valueChip({ title: "Fat", value: `${entry.fat} g`, tone: "gold" })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[color:rgba(245,236,216,0.18)] bg-[rgba(24,25,18,0.86)] p-6 text-center">
                  <BowlFood size={32} weight="bold" className="mx-auto text-[color:var(--dim)]" />
                  <p className="mt-3 text-base font-bold text-[color:var(--foreground)]">No meals logged yet.</p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    Add breakfast, lunch, or a post-training snack to start the macro log.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
  });
}

function CoachTab({
  state,
  scores,
  onSend,
  busy,
}: {
  state: AppState;
  scores: ReturnType<typeof getAssessmentScores>;
  onSend: (prompt: string) => void;
  busy: boolean;
}) {
  return paperSection({
    eyebrow: "AI Coach",
    title: "Ask for direction, then keep the answer grounded in the data.",
    summary:
      "The coach returns a short, actionable response and can adjust the roadmap without turning into generic advice.",
    children: (
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="paper-card-soft p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">Prompt library</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {coachPromptLibrary.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSend(prompt)}
                className="paper-chip rounded-full px-3 py-2 text-xs font-black transition hover:border-[color:rgba(210,160,74,0.34)] hover:text-[color:var(--foreground)]"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-[20px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--dim)]">Active gap</p>
            <p className="mt-2 text-xl font-black tracking-[-0.04em] text-[color:var(--foreground)]">
              {assessmentLabels[scores.gaps[0]?.metric ?? "passing"]}
            </p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              The coach can lean on the biggest gap, the current week, or the meal log depending on what you ask.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
              Chat
            </p>
            <div className="mt-3 flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
              {state.coach.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[85%] rounded-[20px] border px-4 py-3 text-sm leading-6",
                    message.role === "user"
                      ? "ml-auto border-[color:rgba(132,181,109,0.35)] bg-[rgba(132,181,109,0.16)] text-[color:var(--foreground)]"
                      : "border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] text-[color:var(--muted)]",
                  )}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                    {message.role === "user" ? "You" : "VarFoot"}
                  </p>
                  <p className="mt-1">{message.text}</p>
                </div>
              ))}
            </div>
          </div>

          <CoachComposer
            defaultPrompt={state.coach.draft || coachPromptLibrary[0]}
            onSend={onSend}
            busy={busy}
          />
        </div>
      </div>
    ),
  });
}

function LibraryTab({
  state,
  onToggleDrill,
}: {
  state: AppState;
  onToggleDrill: (name: string) => void;
}) {
  return paperSection({
    eyebrow: "Library",
    title: "Keep the useful drills, keep the library small.",
    summary: "The drill library doubles as content for the coach and the plan detail screens.",
    children: (
      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="grid gap-3">
          {drillLibrary.map((drill) => (
            <div key={drill.name} className="rounded-[22px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--dim)]">{drill.focus}</p>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[color:var(--foreground)]">
                    {drill.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleDrill(drill.name)}
                  className={cn(
                    "rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]",
                    state.library.savedDrills.includes(drill.name) ? "paper-chip-active" : "paper-chip",
                  )}
                >
                  {state.library.savedDrills.includes(drill.name) ? "Saved" : "Save"}
                </button>
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{drill.instructions}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {valueChip({ title: "Time", value: drill.duration, tone: "blue" })}
                {valueChip({ title: "Target", value: drill.target, tone: "gold" })}
                {valueChip({ title: "Equipment", value: drill.equipment, tone: "neutral" })}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3">
          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">
              Saved drills
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {state.library.savedDrills.map((drill) => (
                <span key={drill} className="paper-chip rounded-full px-3 py-2 text-xs font-black">
                  {drill}
                </span>
              ))}
            </div>
          </div>

          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">Screen map</p>
            <div className="mt-3 grid gap-2">
              {screenMap.map((screen) => (
                <div
                  key={screen}
                  className="rounded-[16px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] px-3 py-2 text-sm font-bold text-[color:var(--foreground)]"
                >
                  {screen}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  });
}

function ProfileTab({
  state,
  scores,
  onAssessmentChange,
  onLoadDemo,
  onReset,
  localMode,
}: {
  state: AppState;
  scores: ReturnType<typeof getAssessmentScores>;
  onAssessmentChange: (key: keyof AppState["assessment"], value: string) => void;
  onLoadDemo: () => void;
  onReset: () => void;
  localMode: boolean;
}) {
  return paperSection({
    eyebrow: "Account + system states",
    title: "Profile, persistence, and the demo stack.",
    summary:
      "This screen mirrors the handoff’s account and system states while keeping the implementation lightweight enough for the hackathon demo.",
    children: (
      <div className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
        <div className="grid gap-3">
          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">Profile</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <MetricField
                label="Name"
                value={state.assessment.name}
                onChange={(value) => onAssessmentChange("name", value)}
              />
              <MetricField
                label="School"
                value={state.assessment.school}
                onChange={(value) => onAssessmentChange("school", value)}
              />
              <MetricField
                label="Position"
                value={state.assessment.position}
                onChange={(value) => onAssessmentChange("position", value)}
              />
              <MetricField
                label="Goal"
                value={state.assessment.seasonGoal}
                onChange={(value) => onAssessmentChange("seasonGoal", value)}
              />
            </div>
          </div>

          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">Persistence</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {valueChip({ title: "Local cache", value: "On", tone: "green" })}
              {valueChip({ title: "Supabase", value: localMode ? "Not configured" : "Ready", tone: localMode ? "red" : "green" })}
              {valueChip({ title: "Plan data", value: state.plan.weeks.length ? "Saved" : "Empty", tone: "blue" })}
            </div>
          </div>

          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">System state</p>
            <div className="mt-3 grid gap-2">
              <div className="rounded-[18px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-4">
                <p className="text-sm font-bold text-[color:var(--foreground)]">
                  {state.onboardingComplete ? "Onboarding complete." : "Onboarding still open."}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  The app can still be used in demo mode even without Supabase keys.
                </p>
              </div>
              <div className="rounded-[18px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-4">
                <p className="text-sm font-bold text-[color:var(--foreground)]">
                  Current readiness: {Math.round(scores.overallScore)}%
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Top gap: {assessmentLabels[scores.gaps[0]?.metric ?? "passing"]}.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--green)]">Actions</p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={onLoadDemo}
                className="paper-button-primary inline-flex h-11 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em]"
              >
                Load demo athlete
              </button>
              <button
                type="button"
                onClick={onReset}
                className="paper-button-secondary inline-flex h-11 items-center justify-center rounded-[16px] px-4 text-sm font-black tracking-[-0.02em]"
              >
                Reset browser data
              </button>
            </div>
          </div>

          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">Benchmark notes</p>
            <div className="mt-3 grid gap-2">
              {Object.entries(assessmentBenchmarks).slice(0, 4).map(([key, benchmark]) => (
                <div
                  key={key}
                  className="rounded-[18px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(36,37,28,0.96)] p-4"
                >
                  <p className="text-sm font-bold text-[color:var(--foreground)]">{benchmark.label}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    Freshman {benchmark.freshman}
                    {benchmark.unit === "%" ? "%" : ` ${benchmark.unit}`} · JV {benchmark.jv}
                    {benchmark.unit === "%" ? "%" : ` ${benchmark.unit}`} · Varsity {benchmark.varsity}
                    {benchmark.unit === "%" ? "%" : ` ${benchmark.unit}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="paper-card-soft p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">Screen families</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {screenMap.map((screen) => (
                <div
                  key={screen}
                  className="rounded-[16px] border border-[color:rgba(245,236,216,0.12)] bg-[rgba(24,25,18,0.86)] px-3 py-2 text-xs font-bold text-[color:var(--foreground)]"
                >
                  {screen}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  });
}

export default App;
