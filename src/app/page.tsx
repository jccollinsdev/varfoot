"use client";

import Image from "next/image";
import {
  House,
  ClipboardText,
  Target,
  BowlFood,
  ChatsCircle,
  Timer,
  ChartLineUp,
  ArrowRight,
  X,
} from "@phosphor-icons/react";
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Session } from "@supabase/supabase-js";

import {
  assessmentBenchmarks,
  coachPromptLibrary,
  clearState,
  createBlankState,
  createDemoState,
  drillLibrary,
  getAssessmentScores,
  getNutritionTotals,
  addFoodEntry,
  foodCatalog,
  loadState,
  saveState,
  type AppState,
  type FoodEntry,
  type MetricKey,
} from "@/lib/varfoot";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import {
  loadRemoteState,
  upsertRemoteState,
  upsertRemoteProfile,
} from "@/lib/varfoot-sync";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type NavTab = "home" | "stats" | "plan" | "fuel" | "coach";
type AuthMode = "sign-in" | "sign-up";
type Tone = "neutral" | "green" | "gold" | "red" | "blue";
type DashSection = "benchmark" | "assess" | "library";

const NAV = [
  { key: "home" as NavTab, label: "Home", Icon: House },
  { key: "stats" as NavTab, label: "Stats", Icon: ClipboardText },
  { key: "plan" as NavTab, label: "Plan", Icon: Target },
  { key: "fuel" as NavTab, label: "Fuel", Icon: BowlFood },
  { key: "coach" as NavTab, label: "Coach", Icon: ChatsCircle },
];

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const TONE: Record<Tone, string> = {
  neutral:
    "border-[rgba(245,236,216,0.11)] bg-[rgba(38,39,30,0.96)] text-[color:var(--muted)]",
  green:
    "border-[rgba(132,181,109,0.36)] bg-[rgba(132,181,109,0.14)] text-[color:var(--green)]",
  gold: "border-[rgba(210,160,74,0.4)] bg-[rgba(210,160,74,0.13)] text-[color:var(--gold)]",
  red: "border-[rgba(215,121,109,0.34)] bg-[rgba(215,121,109,0.1)] text-[color:var(--red)]",
  blue: "border-[rgba(134,178,199,0.32)] bg-[rgba(134,178,199,0.1)] text-[color:var(--blue)]",
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("paper-card p-4", className)}>{children}</div>;
}

function SoftCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("paper-card-soft p-4", className)}>{children}</div>;
}

function Eyebrow({ children, tone = "dim" }: { children: ReactNode; tone?: "dim" | "green" | "gold" }) {
  return (
    <p className={cn(
      "text-[10px] font-black uppercase tracking-[0.22em]",
      tone === "green" && "text-[color:var(--green)]",
      tone === "gold" && "text-[color:var(--gold)]",
      tone === "dim" && "text-[color:var(--dim)]",
    )}>
      {children}
    </p>
  );
}

function Stat({ label, value, tone = "neutral", compact }: {
  label: string; value: string; tone?: Tone; compact?: boolean;
}) {
  return (
    <div className={cn("rounded-[14px] border px-3 shadow-[2px_2px_0_rgba(0,0,0,0.16)]", TONE[tone], compact ? "py-2" : "py-2.5")}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-75">{label}</p>
      <p className={cn("mt-0.5 font-black tracking-[-0.03em]", compact ? "text-[13px]" : "text-[15px]")}>{value}</p>
    </div>
  );
}

function MetricBar({ label, score, value, unit, target }: {
  label: string; score: number; value: number; unit: string; target: number;
}) {
  const pct = Math.max(3, Math.min(100, score));
  const color = score >= 72 ? "var(--green)" : score >= 44 ? "var(--gold)" : "var(--red)";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-[color:var(--foreground)]">{label}</span>
        <span className="font-mono text-[12px]" style={{ color }}>
          {typeof value === "number" && value < 10 ? value.toFixed(1) : Math.round(value)}
          <span className="text-[10px] text-[color:var(--dim)] ml-0.5">{unit}</span>
        </span>
      </div>
      <div className="relative h-[7px] overflow-hidden rounded-full bg-[rgba(245,236,216,0.06)]">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
        />
        <span className="absolute top-[-3px] h-[13px] w-[1.5px] rounded-full bg-[rgba(245,236,216,0.35)]" style={{ left: "25%" }} />
        <span className="absolute top-[-3px] h-[13px] w-[1.5px] rounded-full bg-[rgba(245,236,216,0.35)]" style={{ left: "55%" }} />
      </div>
      <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.14em] text-[color:var(--dim)]">
        <span>Freshman</span>
        <span>JV</span>
        <span>Varsity ({target} {unit})</span>
      </div>
    </div>
  );
}

function Gauge({ score }: { score: number }) {
  const safe = Math.max(0, Math.min(100, score));
  const label = safe >= 80 ? "Varsity ready" : safe >= 60 ? "Approaching" : safe >= 40 ? "Building base" : "Early stage";
  const color = safe >= 72 ? "var(--green)" : safe >= 44 ? "var(--gold)" : "var(--red)";
  return (
    <div className="relative flex h-[164px] w-[164px] items-center justify-center">
      <div className="gauge-glow absolute inset-2 rounded-full blur-lg" style={{ background: `conic-gradient(${color}55 0 ${safe}%, transparent ${safe}% 100%)` }} />
      <div className="absolute inset-0 rounded-full bg-[rgba(245,236,216,0.05)]" />
      <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${color} 0 ${safe}%, rgba(245,236,216,0.07) ${safe}% 100%)` }} />
      <div className="absolute inset-[10px] rounded-full border border-[rgba(245,236,216,0.07)] bg-[rgba(10,11,8,0.95)]" />
      <div className="relative z-10 text-center">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[color:var(--muted)]">Readiness</p>
        <p className="text-[42px] font-black leading-none tracking-[-0.08em]" style={{ color: safe >= 44 ? "var(--foreground)" : "var(--red)" }}>{safe}</p>
        <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.18em]" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Screen
// ─────────────────────────────────────────────────────────────────────────────

const authSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type AuthFormData = z.infer<typeof authSchema>;

function AuthScreen({ loading, error, onSubmit, onDemo }: {
  loading: boolean; error: string | null;
  onSubmit: (mode: AuthMode, email: string, pass: string) => Promise<void>;
  onDemo: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <div className="phone-shell" style={{ background: "var(--background)" }}>
      <div className="phone-column" style={{ justifyContent: "center", alignItems: "center", padding: "24px 20px", paddingTop: "calc(24px + env(safe-area-inset-top, 0px))", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="noise-layer" />
        <div className="relative z-10 w-full">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-[22px] border" style={{ borderColor: "rgba(132,181,109,0.28)", background: "rgba(32,33,25,0.96)", boxShadow: "0 0 0 1px rgba(0,0,0,0.3) inset, 0 0 40px rgba(132,181,109,0.1)" }}>
              <Image src="/varfoot-mark.svg" alt="VarFoot" width={40} height={40} priority />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--green)]">VarFoot</p>
              <h1 className="mt-1 text-[28px] font-black leading-tight tracking-[-0.06em] text-[color:var(--foreground)]">
                {mode === "sign-in" ? "Welcome back." : "Start your journey."}
              </h1>
              <p className="mt-1.5 text-[13px] text-[color:var(--muted)]">
                {mode === "sign-in" ? "Pick up where you left off." : "Track your gaps. Close the distance."}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="paper-shell rounded-[24px] p-5">
            <form className="space-y-3" onSubmit={form.handleSubmit(async (v) => {
              await onSubmit(mode, v.email.trim().toLowerCase(), v.password);
            })}>
              <label className="grid gap-1.5 text-[12px] font-black uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Email
                <input className="paper-field h-12 px-4 text-[14px] font-semibold" placeholder="you@example.com" autoComplete="email" autoCapitalize="none" inputMode="email" {...form.register("email")} />
                {form.formState.errors.email ? <span className="text-[11px] font-bold text-[color:var(--red)]">{form.formState.errors.email.message}</span> : null}
              </label>
              <label className="grid gap-1.5 text-[12px] font-black uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Password
                <input type="password" className="paper-field h-12 px-4 text-[14px] font-semibold" placeholder="Minimum 8 characters" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} {...form.register("password")} />
                {form.formState.errors.password ? <span className="text-[11px] font-bold text-[color:var(--red)]">{form.formState.errors.password.message}</span> : null}
              </label>
              {error ? <div className="rounded-[12px] border border-[rgba(215,121,109,0.3)] bg-[rgba(215,121,109,0.1)] px-4 py-3 text-[13px] text-[color:var(--red)]">{error}</div> : null}
              <button type="submit" disabled={loading} className="paper-button-primary mt-1 flex h-12 w-full items-center justify-center rounded-[14px] text-[14px]">
                {loading ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => setMode((m) => m === "sign-in" ? "sign-up" : "sign-in")} className="paper-chip rounded-full px-4 py-2 text-[11px] font-black">
              {mode === "sign-in" ? "New? Create account" : "Already have an account?"}
            </button>
            <button type="button" onClick={onDemo} className="paper-chip rounded-full px-4 py-2 text-[11px] font-black">
              Try demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App Bar
// ─────────────────────────────────────────────────────────────────────────────

function AppBar({ title, playerName, syncState, onAvatarTap }: {
  title: string; playerName: string; syncState: string; onAvatarTap: () => void;
}) {
  const initials = playerName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "VA";
  const syncDot = syncState === "synced" ? "var(--green)" : syncState === "saving" ? "var(--gold)" : syncState === "error" ? "var(--red)" : undefined;

  return (
    <div className="app-bar">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border" style={{ borderColor: "rgba(245,236,216,0.11)", background: "rgba(32,33,25,0.96)" }}>
          <Image src="/varfoot-mark.svg" alt="VarFoot" width={18} height={18} />
        </div>
        <span className="text-[17px] font-black tracking-[-0.03em] text-[color:var(--foreground)]">{title}</span>
        {syncDot ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: syncDot }} /> : null}
      </div>
      <button type="button" onClick={onAvatarTap} className="flex h-9 w-9 items-center justify-center rounded-full border text-[13px] font-black transition" style={{ borderColor: "rgba(245,236,216,0.14)", background: "rgba(36,37,28,0.96)", color: "var(--muted)" }}>
        {initials}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom Nav
// ─────────────────────────────────────────────────────────────────────────────

function BottomNav({ active, onSelect }: { active: NavTab; onSelect: (tab: NavTab) => void }) {
  return (
    <div className="bottom-nav">
      <div className="nav-grid">
        {NAV.map(({ key, label, Icon }) => {
          const isActive = key === active;
          return (
            <button key={key} type="button" className="nav-item" onClick={() => onSelect(key)}>
              <span className="nav-dot" style={{ background: isActive ? "var(--green)" : "transparent", opacity: isActive ? 1 : 0 }} />
              <Icon size={22} weight={isActive ? "fill" : "regular"} style={{ color: isActive ? "var(--green)" : "var(--dim)", transition: "color 200ms" }} />
              <span className="nav-label" style={{ color: isActive ? "var(--green)" : "var(--dim)" }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Sheet
// ─────────────────────────────────────────────────────────────────────────────

function ProfileSheet({ state, localMode, syncState, onSignOut, onLoadDemo, onReset, onClose }: {
  state: AppState; localMode: boolean; syncState: string;
  onSignOut: () => Promise<void>; onLoadDemo: () => void; onReset: () => void; onClose: () => void;
}) {
  const syncLabels: Record<string, string> = { local: "Local only", loading: "Loading…", saving: "Saving…", synced: "Synced", error: "Sync error", "signed-out": "Signed out" };
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full rounded-t-[28px] border border-[rgba(245,236,216,0.11)]" style={{ background: "rgba(16,17,12,0.98)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
        <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-9 rounded-full bg-[rgba(245,236,216,0.2)]" /></div>
        <div className="px-5 pb-2 pt-3">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border text-[22px] font-black text-[color:var(--foreground)]" style={{ borderColor: "rgba(245,236,216,0.14)", background: "rgba(32,33,25,0.96)" }}>
              {state.assessment.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[19px] font-black tracking-[-0.04em]">{state.assessment.name}</p>
              <p className="text-[13px] text-[color:var(--muted)]">{state.assessment.school}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--dim)]">{state.assessment.position}</p>
            </div>
          </div>
          <div className="mb-4 rounded-[14px] border border-[rgba(245,236,216,0.09)] bg-[rgba(30,31,23,0.96)] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--dim)]">Sync</p>
            <p className="mt-0.5 text-[13px] font-bold text-[color:var(--foreground)]">{localMode ? "Local mode" : (syncLabels[syncState] ?? syncState)}</p>
          </div>
          <div className="space-y-2">
            <button type="button" onClick={onLoadDemo} className="paper-button-primary flex h-12 w-full items-center justify-center rounded-[14px] text-[14px]">Load demo athlete</button>
            <button type="button" onClick={onReset} className="paper-button-secondary flex h-12 w-full items-center justify-center rounded-[14px] text-[14px]">Clear all data</button>
            {!localMode ? (
              <button type="button" onClick={() => void onSignOut()} className="flex h-12 w-full items-center justify-center rounded-[14px] border text-[14px] font-black" style={{ borderColor: "rgba(215,121,109,0.26)", background: "rgba(215,121,109,0.08)", color: "var(--red)" }}>Sign out</button>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="mt-4 flex h-10 w-full items-center justify-center text-[12px] font-black uppercase tracking-[0.14em] text-[color:var(--dim)]">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME TAB
// ─────────────────────────────────────────────────────────────────────────────

function HomeTab({ state, scores, nutritionTotals, onGoToStats, onGoToPlan, onLoadDemo, onGeneratePlan, planLoading }: {
  state: AppState; scores: ReturnType<typeof getAssessmentScores>; nutritionTotals: ReturnType<typeof getNutritionTotals>;
  onGoToStats: () => void; onGoToPlan: () => void; onLoadDemo: () => void;
  onGeneratePlan: () => Promise<void>; planLoading: boolean;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 5 ? "Up early" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = state.assessment.name.split(" ")[0] || "Athlete";
  const topGaps = scores.gaps.slice(0, 2);
  const selectedWeek = state.plan.weeks.find((w) => w.week === state.selectedWeek) ?? state.plan.weeks[0];
  const nextSession = selectedWeek?.sessions.find((s) => s.status === "today") ?? selectedWeek?.sessions[0];
  const calPct = Math.min(1, nutritionTotals.calories / state.nutrition.calorieTarget);
  const calTone: Tone = calPct >= 0.85 ? "green" : calPct >= 0.6 ? "gold" : "red";

  return (
    <div className="tab-enter space-y-3 px-4 pb-4 pt-2">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--dim)]">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </p>
        <h2 className="mt-0.5 text-[26px] font-black tracking-[-0.05em] text-[color:var(--foreground)]">
          {greeting}, {firstName}.
        </h2>
      </div>

      {/* Welcome banner */}
      {!state.onboardingComplete ? (
        <div className="rounded-[20px] border p-5" style={{ borderColor: "rgba(132,181,109,0.22)", background: "linear-gradient(145deg, rgba(132,181,109,0.1), rgba(20,21,15,0.98))" }}>
          <Eyebrow tone="green">Welcome to VarFoot</Eyebrow>
          <h3 className="mt-1.5 text-[22px] font-black tracking-[-0.05em]">Build the plan before tryouts.</h3>
          <p className="mt-2 text-[13px] leading-5 text-[color:var(--muted)]">Start with your physical baseline. Compare against varsity targets. Follow the roadmap.</p>
          <div className="mt-4 flex gap-2.5">
            <button type="button" onClick={onGoToStats} className="paper-button-primary flex h-10 items-center gap-1.5 rounded-[12px] px-4 text-[13px]">
              Start assessment <ArrowRight size={14} weight="bold" />
            </button>
            <button type="button" onClick={onLoadDemo} className="paper-button-secondary flex h-10 items-center rounded-[12px] px-4 text-[13px]">Demo</button>
          </div>
        </div>
      ) : null}

      {/* Readiness card */}
      {state.onboardingComplete ? (
        <Card>
          <div className="flex items-center gap-4">
            <Gauge score={Math.round(scores.overallScore)} />
            <div className="flex-1 min-w-0 space-y-2">
              <Stat label="Goal" value={state.assessment.seasonGoal.length > 24 ? state.assessment.seasonGoal.slice(0, 24) + "…" : state.assessment.seasonGoal} tone="neutral" compact />
              <Stat label="Top gap" value={topGaps[0]?.label ?? "—"} tone="gold" compact />
              <Stat label="Fuel" value={`${nutritionTotals.calories} / ${state.nutrition.calorieTarget} kcal`} tone={calTone} compact />
            </div>
          </div>
        </Card>
      ) : null}

      {/* Next session */}
      {nextSession ? (
        <button type="button" onClick={onGoToPlan} className="w-full text-left">
          <SoftCard className="transition active:scale-[0.98]">
            <Eyebrow>Next session</Eyebrow>
            <div className="mt-2 flex items-start gap-3">
              <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px]" style={{ background: "rgba(132,181,109,0.14)" }}>
                <Timer size={22} weight="bold" style={{ color: "var(--green)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-black tracking-[-0.04em] text-[color:var(--foreground)]">{nextSession.title}</p>
                <p className="text-[13px] text-[color:var(--muted)]">{nextSession.drill}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="paper-chip rounded-full px-2.5 py-1 text-[10px] font-black">{nextSession.day}</span>
                  <span className="paper-chip rounded-full px-2.5 py-1 text-[10px] font-black">{nextSession.duration}</span>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: "rgba(132,181,109,0.14)", color: "var(--green)", border: "1px solid rgba(132,181,109,0.3)" }}>{nextSession.focus}</span>
                </div>
              </div>
            </div>
          </SoftCard>
        </button>
      ) : null}

      {/* Top gaps */}
      {topGaps.length > 0 && state.onboardingComplete ? (
        <div>
          <Eyebrow>Top gaps to close</Eyebrow>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {topGaps.map((gap) => (
              <SoftCard key={gap.metric} className="py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--dim)]">{gap.label}</p>
                <p className="mt-1 text-[30px] font-black tracking-[-0.07em] leading-none text-[color:var(--foreground)]">
                  {Math.round(gap.score)}<span className="text-[13px] text-[color:var(--dim)]">%</span>
                </p>
                <p className="mt-1 text-[11px] text-[color:var(--muted)]">{gap.higherIsBetter ? "Push higher ↑" : "Push lower ↓"}</p>
              </SoftCard>
            ))}
          </div>
        </div>
      ) : null}

      {/* Week card */}
      {selectedWeek && state.onboardingComplete ? (
        <button type="button" onClick={onGoToPlan} className="w-full text-left">
          <Card className="transition active:scale-[0.98]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Eyebrow tone="green">Week {selectedWeek.week} · {selectedWeek.label}</Eyebrow>
                <p className="mt-1 text-[13px] leading-5 text-[color:var(--muted)]">{selectedWeek.readinessNote}</p>
              </div>
              <ArrowRight size={18} weight="bold" style={{ color: "var(--dim)", flexShrink: 0 }} />
            </div>
          </Card>
        </button>
      ) : null}

      {state.onboardingComplete ? (
        <button type="button" onClick={() => void onGeneratePlan()} disabled={planLoading} className="paper-button-secondary flex h-11 w-full items-center justify-center rounded-[14px] text-[13px]">
          {planLoading ? "Generating plan…" : "Regenerate training plan"}
        </button>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS TAB
// ─────────────────────────────────────────────────────────────────────────────

function StatsTab({ state, scores, onAssessmentChange, onGeneratePlan, onToggleDrill, planLoading }: {
  state: AppState; scores: ReturnType<typeof getAssessmentScores>;
  onAssessmentChange: (key: keyof AppState["assessment"], value: string) => void;
  onGeneratePlan: () => Promise<void>; onToggleDrill: (name: string) => void; planLoading: boolean;
}) {
  const [section, setSection] = useState<DashSection>("benchmark");
  const SECTIONS: Array<{ key: DashSection; label: string }> = [
    { key: "benchmark", label: "Benchmark" },
    { key: "assess", label: "Assessment" },
    { key: "library", label: "Drill Library" },
  ];

  return (
    <div className="tab-enter space-y-3 px-4 pb-4 pt-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {SECTIONS.map((s) => (
          <button key={s.key} type="button" onClick={() => setSection(s.key)} className={cn("flex-shrink-0 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] transition", section === s.key ? "paper-chip-active" : "paper-chip")}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Benchmark */}
      {section === "benchmark" ? (
        <div className="space-y-3">
          <Card>
            <div className="flex items-center gap-5">
              <Gauge score={Math.round(scores.overallScore)} />
              <div className="flex-1 space-y-2">
                <div><Eyebrow>Technical</Eyebrow><p className="text-[28px] font-black tracking-[-0.06em] leading-none">{Math.round(scores.technicalScore)}<span className="text-[13px] font-bold text-[color:var(--dim)]">/100</span></p></div>
                <div><Eyebrow tone="gold">Physical</Eyebrow><p className="text-[28px] font-black tracking-[-0.06em] leading-none">{Math.round(scores.physicalScore)}<span className="text-[13px] font-bold text-[color:var(--dim)]">/100</span></p></div>
              </div>
            </div>
          </Card>

          <Card>
            <Eyebrow tone="green">Technical</Eyebrow>
            <div className="mt-3 space-y-5">
              {(["passing", "shooting", "dribbling", "firstTouch", "speed"] as MetricKey[]).map((metric) => {
                const ms = scores.metricScores.find((s) => s.metric === metric)!;
                const bench = assessmentBenchmarks[metric];
                return <MetricBar key={metric} label={bench.label} score={ms.score} value={ms.value} unit={bench.unit} target={bench.varsity} />;
              })}
            </div>
          </Card>

          <Card>
            <Eyebrow tone="gold">Physical</Eyebrow>
            <div className="mt-3 space-y-5">
              {(["pushups", "plankSeconds", "wallSitSeconds"] as MetricKey[]).map((metric) => {
                const ms = scores.metricScores.find((s) => s.metric === metric)!;
                const bench = assessmentBenchmarks[metric];
                return <MetricBar key={metric} label={bench.label} score={ms.score} value={ms.value} unit={bench.unit} target={bench.varsity} />;
              })}
            </div>
          </Card>
        </div>
      ) : null}

      {/* Assessment */}
      {section === "assess" ? (
        <div className="space-y-3">
          <Card>
            <Eyebrow tone="green">Profile</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {([
                { key: "name", label: "Name", span: false },
                { key: "age", label: "Age", span: false },
                { key: "school", label: "School", span: true },
                { key: "position", label: "Position", span: false },
                { key: "height", label: "Height", span: false },
                { key: "weight", label: "Weight", span: false },
                { key: "seasonGoal", label: "Season goal", span: true },
              ] as const).map(({ key, label, span }) => (
                <label key={key} className={cn("grid gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--muted)]", span && "col-span-2")}>
                  {label}
                  <input className="paper-field h-10 px-3 text-[13px] font-semibold" value={state.assessment[key]} onChange={(e) => onAssessmentChange(key, e.target.value)} />
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <Eyebrow tone="gold">Physical tests</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["pushups", "plankSeconds", "wallSitSeconds"] as const).map((metric) => {
                const bench = assessmentBenchmarks[metric];
                return (
                  <label key={metric} className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    {bench.label}
                    <div className="flex items-center gap-1">
                      <input type="number" inputMode="numeric" className="paper-field h-10 flex-1 px-3 text-[13px] font-semibold" value={state.assessment[metric]} onChange={(e) => onAssessmentChange(metric, e.target.value)} />
                      <span className="flex-shrink-0 text-[10px] text-[color:var(--dim)]">{bench.unit}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </Card>

          <Card>
            <Eyebrow tone="green">Technical tests</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["passing", "shooting", "dribbling", "firstTouch", "speed"] as const).map((metric) => {
                const bench = assessmentBenchmarks[metric];
                return (
                  <label key={metric} className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    {bench.label}
                    <div className="flex items-center gap-1">
                      <input type="number" inputMode="numeric" className="paper-field h-10 flex-1 px-3 text-[13px] font-semibold" value={state.assessment[metric]} onChange={(e) => onAssessmentChange(metric, e.target.value)} />
                      <span className="flex-shrink-0 text-[10px] text-[color:var(--dim)]">{bench.unit}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </Card>

          <button type="button" onClick={() => void onGeneratePlan()} disabled={planLoading} className="paper-button-primary flex h-12 w-full items-center justify-center rounded-[14px] text-[14px]">
            {planLoading ? "Building your roadmap…" : "Generate training plan"}
          </button>
        </div>
      ) : null}

      {/* Library */}
      {section === "library" ? (
        <div className="space-y-3">
          {drillLibrary.map((drill) => {
            const saved = state.library.savedDrills.includes(drill.name);
            return (
              <Card key={drill.name}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <Eyebrow tone="green">{drill.focus}</Eyebrow>
                    <h3 className="mt-1 text-[17px] font-black tracking-[-0.04em]">{drill.name}</h3>
                    <p className="mt-1.5 text-[13px] leading-5 text-[color:var(--muted)]">{drill.instructions}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="paper-chip rounded-full px-2.5 py-1 text-[10px] font-black">{drill.duration}</span>
                      <span className="paper-chip rounded-full px-2.5 py-1 text-[10px] font-black">{drill.equipment}</span>
                    </div>
                    <p className="mt-2 text-[11px] font-bold" style={{ color: "var(--green)" }}>Target: {drill.target}</p>
                  </div>
                  <button type="button" onClick={() => onToggleDrill(drill.name)} className={cn("flex-shrink-0 rounded-[11px] border px-3 py-1.5 text-[11px] font-black transition", saved ? "border-[rgba(132,181,109,0.38)] bg-[rgba(132,181,109,0.16)] text-[color:var(--green)]" : "paper-chip")}>
                    {saved ? "✓ Saved" : "Save"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN TAB
// ─────────────────────────────────────────────────────────────────────────────

function PlanTab({ state, selectedWeek, onSelectWeek, onGeneratePlan, planLoading }: {
  state: AppState; selectedWeek: AppState["plan"]["weeks"][number] | undefined;
  onSelectWeek: (week: number) => void; onGeneratePlan: () => Promise<void>; planLoading: boolean;
}) {
  if (!state.plan.weeks.length) {
    return (
      <div className="tab-enter space-y-3 px-4 pb-4 pt-2">
        <h2 className="text-[24px] font-black tracking-[-0.05em]">Training Plan</h2>
        <Card>
          <div className="py-5 text-center">
            <ChartLineUp size={44} weight="light" style={{ margin: "0 auto", color: "var(--dim)" }} />
            <p className="mt-3 text-[17px] font-black tracking-[-0.04em]">No plan yet</p>
            <p className="mt-1.5 text-[13px] text-[color:var(--muted)]">Complete the assessment to generate your 6-week varsity roadmap.</p>
            <button type="button" onClick={() => void onGeneratePlan()} disabled={planLoading} className="paper-button-primary mt-5 flex h-11 w-full items-center justify-center rounded-[13px] text-[14px]">
              {planLoading ? "Generating…" : "Generate plan"}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const statusColor: Record<string, string> = { done: "var(--green)", today: "var(--gold)", queued: "var(--dim)" };
  const statusLabel: Record<string, string> = { done: "Done", today: "Today", queued: "Up next" };

  return (
    <div className="tab-enter space-y-3 px-4 pb-4 pt-2">
      <div>
        <h2 className="text-[24px] font-black tracking-[-0.05em]">Training Plan</h2>
        <p className="text-[13px] text-[color:var(--muted)]">6-week roadmap</p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {state.plan.weeks.map((week) => (
          <button key={week.week} type="button" onClick={() => onSelectWeek(week.week)} className={cn("flex-shrink-0 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition", week.week === state.selectedWeek ? "paper-chip-active" : "paper-chip")}>
            Wk {week.week}
          </button>
        ))}
      </div>

      {selectedWeek ? (
        <>
          <Card>
            <Eyebrow tone="green">Week {selectedWeek.week}</Eyebrow>
            <h3 className="mt-1 text-[20px] font-black tracking-[-0.05em]">{selectedWeek.label}</h3>
            <p className="mt-2 text-[13px] leading-5 text-[color:var(--muted)]">{selectedWeek.readinessNote}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="paper-chip rounded-full px-3 py-1.5 text-[10px] font-black">Focus: {selectedWeek.emphasis}</span>
              <span className="paper-chip rounded-full px-3 py-1.5 text-[10px] font-black">{selectedWeek.sessions.length} sessions</span>
            </div>
          </Card>

          {selectedWeek.sessions.map((session) => (
            <SoftCard key={`${session.day}-${session.title}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[12px] font-black" style={{ background: `${statusColor[session.status]}18`, color: statusColor[session.status] }}>
                  {session.day}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] font-black tracking-[-0.03em] text-[color:var(--foreground)]">{session.title}</p>
                    <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: statusColor[session.status], background: `${statusColor[session.status]}18`, border: `1px solid ${statusColor[session.status]}38` }}>
                      {statusLabel[session.status]}
                    </span>
                  </div>
                  <p className="text-[13px] text-[color:var(--muted)]">{session.drill}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="paper-chip rounded-full px-2.5 py-1 text-[10px] font-black">{session.duration}</span>
                    <span className="paper-chip rounded-full px-2.5 py-1 text-[10px] font-black">{session.focus}</span>
                  </div>
                  <p className="mt-2 text-[11px] font-bold" style={{ color: "var(--green)" }}>Target: {session.target}</p>
                </div>
              </div>
            </SoftCard>
          ))}
        </>
      ) : null}

      <button type="button" onClick={() => void onGeneratePlan()} disabled={planLoading} className="paper-button-secondary flex h-11 w-full items-center justify-center rounded-[14px] text-[13px]">
        {planLoading ? "Regenerating…" : "Regenerate plan"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FUEL TAB
// ─────────────────────────────────────────────────────────────────────────────

const mealSchema = z.object({
  meal: z.enum(["Breakfast", "Lunch", "Snack", "Dinner"]),
  food: z.string().min(1),
});
type MealForm = z.infer<typeof mealSchema>;

function FuelTab({ state, totals, onAddMeal }: {
  state: AppState; totals: ReturnType<typeof getNutritionTotals>; onAddMeal: (meal: FoodEntry["meal"], food: string) => void;
}) {
  const form = useForm<MealForm>({ resolver: zodResolver(mealSchema), defaultValues: { meal: "Breakfast", food: foodCatalog[0]?.name ?? "" } });
  const calPct = Math.min(100, (totals.calories / state.nutrition.calorieTarget) * 100);
  const protPct = Math.min(100, (totals.protein / state.nutrition.proteinTarget) * 100);
  const carbPct = Math.min(100, (totals.carbs / state.nutrition.carbTarget) * 100);
  const fatPct = Math.min(100, (totals.fat / state.nutrition.fatTarget) * 100);

  return (
    <div className="tab-enter space-y-3 px-4 pb-4 pt-2">
      <div>
        <h2 className="text-[24px] font-black tracking-[-0.05em]">Fuel</h2>
        <p className="text-[13px] text-[color:var(--muted)]">Today&apos;s nutrition</p>
      </div>

      <Card>
        <Eyebrow tone="green">Daily targets</Eyebrow>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-end gap-1 leading-none"><span className="text-[32px] font-black tracking-[-0.07em]">{totals.calories}</span><span className="mb-1 text-[11px] text-[color:var(--dim)]">/ {state.nutrition.calorieTarget}</span></div>
            <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-[rgba(245,236,216,0.06)]"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${calPct}%`, background: "var(--green)" }} /></div>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--dim)]">Calories</p>
          </div>
          <div>
            <div className="flex items-end gap-1 leading-none"><span className="text-[32px] font-black tracking-[-0.07em]">{totals.protein}</span><span className="mb-1 text-[11px] text-[color:var(--dim)]">g / {state.nutrition.proteinTarget}g</span></div>
            <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-[rgba(245,236,216,0.06)]"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${protPct}%`, background: "var(--blue)" }} /></div>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--dim)]">Protein</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-end gap-1 leading-none"><span className="text-[20px] font-black tracking-[-0.05em]">{totals.carbs}</span><span className="mb-0.5 text-[10px] text-[color:var(--dim)]">g / {state.nutrition.carbTarget}g</span></div>
            <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[rgba(245,236,216,0.06)]"><div className="h-full rounded-full" style={{ width: `${carbPct}%`, background: "var(--gold)" }} /></div>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-[color:var(--dim)]">Carbs</p>
          </div>
          <div>
            <div className="flex items-end gap-1 leading-none"><span className="text-[20px] font-black tracking-[-0.05em]">{totals.fat}</span><span className="mb-0.5 text-[10px] text-[color:var(--dim)]">g / {state.nutrition.fatTarget}g</span></div>
            <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[rgba(245,236,216,0.06)]"><div className="h-full rounded-full" style={{ width: `${fatPct}%`, background: "var(--muted)" }} /></div>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-[color:var(--dim)]">Fat</p>
          </div>
        </div>
      </Card>

      <Card>
        <Eyebrow tone="green">Log food</Eyebrow>
        <form className="mt-3 space-y-3" onSubmit={form.handleSubmit((v) => { onAddMeal(v.meal, v.food); form.reset({ meal: v.meal, food: v.food }); })}>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Meal<select className="paper-field h-10 px-3 text-[13px]" {...form.register("meal")}><option>Breakfast</option><option>Lunch</option><option>Snack</option><option>Dinner</option></select>
            </label>
            <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Food<select className="paper-field h-10 px-3 text-[13px]" {...form.register("food")}>{foodCatalog.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select>
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {foodCatalog.slice(0, 4).map((item) => (
              <button key={item.name} type="button" onClick={() => form.setValue("food", item.name)} className="paper-chip rounded-full px-3 py-1.5 text-[10px] font-black">{item.name}</button>
            ))}
          </div>
          <button type="submit" className="paper-button-primary flex h-10 w-full items-center justify-center rounded-[12px] text-[13px]">Add entry</button>
        </form>
      </Card>

      {state.nutrition.entries.length > 0 ? (
        <div className="space-y-2">
          <Eyebrow>{state.nutrition.entries.length} {state.nutrition.entries.length === 1 ? "entry" : "entries"} today</Eyebrow>
          {state.nutrition.entries.slice(0, 10).map((entry) => (
            <SoftCard key={entry.id} className="py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-black text-[color:var(--foreground)]">{entry.name}</p>
                  <p className="text-[11px] text-[color:var(--muted)]">{entry.meal} · {entry.portion}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[14px] font-black" style={{ color: "var(--green)" }}>{entry.calories} kcal</p>
                  <p className="text-[11px] text-[color:var(--dim)]">{entry.protein}g protein</p>
                </div>
              </div>
            </SoftCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COACH TAB
// ─────────────────────────────────────────────────────────────────────────────

const coachSchema = z.object({ prompt: z.string().min(4, "Type at least 4 characters").max(240) });
type CoachForm = z.infer<typeof coachSchema>;

function CoachTab({ state, onSend, busy }: { state: AppState; onSend: (prompt: string) => Promise<void>; busy: boolean }) {
  const form = useForm<CoachForm>({ resolver: zodResolver(coachSchema), defaultValues: { prompt: "" } });
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.coach.messages, busy]);

  return (
    <div className="tab-enter flex h-full flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-2 scrollbar-none">
        <div className="mb-3">
          <h2 className="text-[24px] font-black tracking-[-0.05em]">AI Coach</h2>
          <p className="text-[13px] text-[color:var(--muted)]">Personalized to your gaps and plan</p>
        </div>

        {state.coach.messages.length === 0 ? (
          <Card className="py-6 text-center">
            <ChatsCircle size={40} weight="light" style={{ margin: "0 auto", color: "var(--dim)" }} />
            <p className="mt-3 text-[16px] font-black tracking-[-0.03em]">Ask your coach anything</p>
            <p className="mt-1.5 text-[13px] leading-5 text-[color:var(--muted)]">Training advice, nutrition tips, plan adjustments — all specific to your benchmark gaps.</p>
          </Card>
        ) : null}

        <div className="space-y-2.5">
          {state.coach.messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[82%] rounded-[18px] px-4 py-3 text-[14px] leading-5", msg.role === "user" ? "border" : "paper-card-soft")} style={msg.role === "user" ? { background: "rgba(132,181,109,0.16)", borderColor: "rgba(132,181,109,0.28)", color: "var(--foreground)" } : undefined}>
                {msg.text}
              </div>
            </div>
          ))}
          {busy ? (
            <div className="flex justify-start">
              <div className="paper-card-soft rounded-[18px] px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="bounce-dot h-2 w-2 rounded-full bg-[color:var(--dim)]" />
                  <span className="bounce-dot h-2 w-2 rounded-full bg-[color:var(--dim)]" />
                  <span className="bounce-dot h-2 w-2 rounded-full bg-[color:var(--dim)]" />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {!busy ? (
          <div className="mt-4 flex flex-wrap gap-1.5 pb-2">
            {coachPromptLibrary.map((prompt) => (
              <button key={prompt} type="button" onClick={() => form.setValue("prompt", prompt)} className="paper-chip rounded-full px-3 py-1.5 text-[10px] font-black transition">{prompt}</button>
            ))}
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      <div className="shrink-0 px-4 pt-3 pb-4" style={{ borderTop: "1px solid rgba(245,236,216,0.07)", background: "rgba(10,11,8,0.94)", backdropFilter: "blur(16px)" }}>
        <form className="flex items-end gap-2" onSubmit={form.handleSubmit(async (v) => { await onSend(v.prompt); form.reset({ prompt: "" }); })}>
          <textarea className="paper-field min-h-[42px] flex-1 resize-none px-3 py-2.5 text-[14px] leading-5" placeholder="Ask your coach…" rows={1} {...form.register("prompt")} />
          <button type="submit" disabled={busy} className="paper-button-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[16px]">↑</button>
        </form>
        {form.formState.errors.prompt ? <p className="mt-1.5 text-[11px] text-[color:var(--red)]">{form.formState.errors.prompt.message}</p> : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Screen
// ─────────────────────────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="phone-shell" style={{ background: "var(--background)" }}>
      <div className="phone-column" style={{ justifyContent: "center", alignItems: "center", padding: 24 }}>
        <div className="noise-layer" />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-[20px] border" style={{ borderColor: "rgba(132,181,109,0.24)", background: "rgba(32,33,25,0.96)" }}>
            <Image src="/varfoot-mark.svg" alt="VarFoot" width={34} height={34} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[color:var(--green)]">VarFoot</p>
          <p className="mt-2 text-[20px] font-black tracking-[-0.04em]">{message}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const localMode = !supabase;

  const [state, setState] = useState<AppState>(() => localMode ? loadState() : createBlankState());
  const [navTab, setNavTab] = useState<NavTab>("home");
  const [demoMode, setDemoMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(!localMode);
  const [bootstrapLoading, setBootstrapLoading] = useState(!localMode);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"local" | "loading" | "saving" | "synced" | "error" | "signed-out">(localMode ? "local" : "loading");
  const saveTimerRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auth
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
      if (!data.session) { setBootstrapLoading(false); setSyncState("signed-out"); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession); setAuthLoading(false); setAuthError(null);
      if (!nextSession) { setBootstrapLoading(false); setSyncState("signed-out"); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  // Bootstrap
  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase; const currentSession = session; let cancelled = false;
    async function bootstrap() {
      setBootstrapLoading(true); setSyncState("loading");
      try {
        await upsertRemoteProfile(client, currentSession);
        const remoteState = await loadRemoteState(client, currentSession.user.id);
        if (cancelled) return;
        setState(remoteState ?? loadState()); setSyncState("synced");
      } catch (err) {
        if (cancelled) return;
        setAuthError(err instanceof Error ? err.message : "Unable to load cloud state."); setState(loadState()); setSyncState("error");
      } finally { if (!cancelled) setBootstrapLoading(false); }
    }
    void bootstrap();
    return () => { cancelled = true; };
  }, [session, supabase]);

  // Auto-save
  useEffect(() => {
    if (localMode) { saveState(state); return; }
    if (!session || bootstrapLoading) return;
    const client = supabase!; const currentSession = session;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try { setSyncState("saving"); await upsertRemoteState(client, currentSession, state); saveState(state); setSyncState("synced"); }
        catch (err) { setAuthError(err instanceof Error ? err.message : "Save failed."); saveState(state); setSyncState("error"); }
      })();
    }, 400);
    return () => { if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current); };
  }, [bootstrapLoading, localMode, session, state, supabase]);

  // Scroll to top on tab change
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [navTab]);

  const scores = useMemo(() => getAssessmentScores(state.assessment), [state.assessment]);
  const nutritionTotals = useMemo(() => getNutritionTotals(state.nutrition.entries), [state.nutrition.entries]);
  const selectedWeek = state.plan.weeks.find((w) => w.week === state.selectedWeek) ?? state.plan.weeks[0];

  function patchState(updater: (prev: AppState) => AppState) { setState(updater); }

  function updateAssessment(key: keyof AppState["assessment"], value: string) {
    patchState((prev) => ({
      ...prev,
      assessment: { ...prev.assessment, [key]: ["name", "age", "school", "position", "seasonGoal", "height", "weight"].includes(key) ? value : Number(value) },
    }));
  }

  async function generatePlan() {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) });
      const payload = await res.json() as { generatedAt: string; weeks: AppState["plan"]["weeks"] };
      patchState((prev) => ({ ...prev, onboardingComplete: true, selectedWeek: 1, plan: { generatedAt: payload.generatedAt, weeks: payload.weeks } }));
      setNavTab("plan");
    } finally { setPlanLoading(false); }
  }

  async function sendCoach(prompt: string) {
    const trimmed = prompt.trim(); if (!trimmed) return;
    setCoachLoading(true);
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, text: trimmed, createdAt: new Date().toISOString() };
    patchState((prev) => ({ ...prev, coach: { ...prev.coach, draft: trimmed, messages: [...prev.coach.messages, userMsg] } }));
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: trimmed, state }) });
      const payload = await res.json() as { answer: string[]; timestamp: string };
      patchState((prev) => ({ ...prev, coach: { ...prev.coach, draft: "", messages: [...prev.coach.messages, { id: crypto.randomUUID(), role: "assistant" as const, text: payload.answer.join(" "), createdAt: payload.timestamp }] } }));
    } finally { setCoachLoading(false); }
  }

  function addMeal(meal: FoodEntry["meal"], foodName: string) {
    const match = foodCatalog.find((item) => item.name === foodName) ?? foodCatalog[0];
    if (!match) return;
    patchState((prev) => ({ ...prev, nutrition: { ...prev.nutrition, entries: [addFoodEntry(match.name, match.portion, meal), ...prev.nutrition.entries] } }));
  }

  function toggleDrill(name: string) {
    patchState((prev) => {
      const saved = prev.library.savedDrills.includes(name);
      return { ...prev, library: { savedDrills: saved ? prev.library.savedDrills.filter((d) => d !== name) : [name, ...prev.library.savedDrills] } };
    });
  }

  async function handleAuthSubmit(mode: AuthMode, email: string, password: string) {
    if (!supabase) return;
    setAuthError(null); setAuthLoading(true);
    const result = mode === "sign-in" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    if (result.error) { setAuthError(result.error.message); setAuthLoading(false); return; }
    if (mode === "sign-up" && !result.data.session) { setAuthError("Account created! Check your inbox to confirm your email, then sign in."); setAuthLoading(false); }
  }

  async function handleSignOut() {
    if (!supabase) return;
    setAuthLoading(true);
    await supabase.auth.signOut();
    clearState(); setState(createBlankState()); setSession(null);
    setBootstrapLoading(false); setSyncState("signed-out"); setAuthLoading(false); setDemoMode(false);
  }

  const tabTitles: Record<NavTab, string> = { home: "VarFoot", stats: "Stats", plan: "Plan", fuel: "Fuel", coach: "Coach" };

  // Auth gates
  if (!localMode && !demoMode && (authLoading || bootstrapLoading)) return <LoadingScreen message="Loading your athlete profile…" />;
  if (!localMode && !demoMode && !session) {
    return (
      <AuthScreen loading={authLoading} error={authError} onSubmit={handleAuthSubmit}
        onDemo={() => { setState(createDemoState()); setDemoMode(true); }} />
    );
  }

  const isCoach = navTab === "coach";

  return (
    <div className="phone-shell" style={{ background: "var(--background)" }}>
      <div className="phone-column">
        <AppBar title={tabTitles[navTab]} playerName={state.assessment.name} syncState={syncState} onAvatarTap={() => setShowProfile(true)} />

        {authError && !showProfile ? (
          <div className="flex items-start gap-3 px-4 py-3 text-[13px]" style={{ background: "rgba(215,121,109,0.1)", borderBottom: "1px solid rgba(215,121,109,0.18)", color: "var(--red)" }}>
            <span className="flex-1">{authError}</span>
            <button type="button" onClick={() => setAuthError(null)} style={{ color: "var(--red)", opacity: 0.7 }}><X size={16} /></button>
          </div>
        ) : null}

        <div ref={contentRef} className={cn("content-area", isCoach ? "content-area-fixed" : "content-area-scroll")}>
          {navTab === "home" && <HomeTab state={state} scores={scores} nutritionTotals={nutritionTotals} onGoToStats={() => setNavTab("stats")} onGoToPlan={() => setNavTab("plan")} onLoadDemo={() => setState(createDemoState())} onGeneratePlan={generatePlan} planLoading={planLoading} />}
          {navTab === "stats" && <StatsTab state={state} scores={scores} onAssessmentChange={updateAssessment} onGeneratePlan={generatePlan} onToggleDrill={toggleDrill} planLoading={planLoading} />}
          {navTab === "plan" && <PlanTab state={state} selectedWeek={selectedWeek} onSelectWeek={(week) => patchState((prev) => ({ ...prev, selectedWeek: week }))} onGeneratePlan={generatePlan} planLoading={planLoading} />}
          {navTab === "fuel" && <FuelTab state={state} totals={nutritionTotals} onAddMeal={addMeal} />}
          {navTab === "coach" && <CoachTab state={state} onSend={sendCoach} busy={coachLoading} />}
        </div>

        <BottomNav active={navTab} onSelect={setNavTab} />

        {showProfile ? (
          <ProfileSheet state={state} localMode={localMode} syncState={syncState} onSignOut={handleSignOut}
            onLoadDemo={() => { setState(createDemoState()); setShowProfile(false); }}
            onReset={() => { setState(createBlankState()); clearState(); setShowProfile(false); }}
            onClose={() => setShowProfile(false)} />
        ) : null}
      </div>
    </div>
  );
}

export default function Page() {
  return <App />;
}
