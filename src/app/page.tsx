"use client";

import Image from "next/image";
import {
  House, ClipboardText, Target, BowlFood, ChatsCircle,
  Timer, ChartLineUp, ArrowRight, X, CaretLeft, Barbell, Lightning,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, useMemo, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Session } from "@supabase/supabase-js";
import {
  assessmentBenchmarks, coachPromptLibrary, clearState,
  createBlankState, createDemoState, drillLibrary, getAssessmentScores,
  getNutritionTotals, addFoodEntry, foodCatalog, loadState, saveState,
  type AppState, type FoodEntry, type MetricKey,
} from "@/lib/varfoot";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { loadRemoteState, upsertRemoteState, upsertRemoteProfile } from "@/lib/varfoot-sync";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type NavTab = "home" | "stats" | "plan" | "fuel" | "coach";
type AuthMode = "sign-in" | "sign-up";
type Tone = "neutral" | "green" | "gold" | "red" | "blue";
type DashSection = "benchmark" | "assess" | "library";
type OnboardStep = 1 | 2 | 3 | 4;

type OnboardData = {
  name: string; age: string; school: string; position: string; seasonGoal: string;
  pushups: string; plankSeconds: string; wallSitSeconds: string;
  passing: string; shooting: string; dribbling: string; firstTouch: string; speed: string;
};

const NAV: Array<{ key: NavTab; label: string; Icon: React.ComponentType<{ size: number; weight: string; style?: React.CSSProperties }> }> = [
  { key: "home", label: "Home", Icon: House as never },
  { key: "stats", label: "Stats", Icon: ClipboardText as never },
  { key: "plan", label: "Plan", Icon: Target as never },
  { key: "fuel", label: "Fuel", Icon: BowlFood as never },
  { key: "coach", label: "Coach", Icon: ChatsCircle as never },
];

const TONE: Record<Tone, string> = {
  neutral: "border-[rgba(245,236,216,0.11)] bg-[rgba(38,39,30,0.96)] text-[color:var(--muted)]",
  green: "border-[rgba(132,181,109,0.36)] bg-[rgba(132,181,109,0.14)] text-[color:var(--green)]",
  gold: "border-[rgba(210,160,74,0.4)] bg-[rgba(210,160,74,0.13)] text-[color:var(--gold)]",
  red: "border-[rgba(215,121,109,0.34)] bg-[rgba(215,121,109,0.1)] text-[color:var(--red)]",
  blue: "border-[rgba(134,178,199,0.32)] bg-[rgba(134,178,199,0.1)] text-[color:var(--blue)]",
};

// ─── Utility ──────────────────────────────────────────────────────────────────
function normMetric(metric: MetricKey, value: number): number {
  const b = assessmentBenchmarks[metric];
  if (b.higherIsBetter === false) {
    return Math.max(0, Math.min(100, ((b.freshman - value) / (b.freshman - b.varsity)) * 100));
  }
  return Math.max(0, Math.min(100, ((value - b.freshman) / (b.varsity - b.freshman)) * 100));
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("paper-card p-4", className)}>{children}</div>;
}
function SoftCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("paper-card-soft p-4", className)}>{children}</div>;
}
function Eyebrow({ children, tone = "dim" }: { children: ReactNode; tone?: "dim" | "green" | "gold" | "blue" }) {
  return (
    <p className={cn("text-[10px] font-black uppercase tracking-[0.22em]",
      tone === "green" && "text-[color:var(--green)]",
      tone === "gold" && "text-[color:var(--gold)]",
      tone === "blue" && "text-[color:var(--blue)]",
      tone === "dim" && "text-[color:var(--dim)]"
    )}>{children}</p>
  );
}
function Stat({ label, value, tone = "neutral", compact }: { label: string; value: string; tone?: Tone; compact?: boolean }) {
  return (
    <div className={cn("rounded-[14px] border px-3 shadow-[2px_2px_0_rgba(0,0,0,0.16)]", TONE[tone], compact ? "py-2" : "py-2.5")}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-75">{label}</p>
      <p className={cn("mt-0.5 font-black tracking-[-0.03em]", compact ? "text-[13px]" : "text-[15px]")}>{value}</p>
    </div>
  );
}

function BenchmarkBar({ metric, value }: { metric: MetricKey; value: number }) {
  const b = assessmentBenchmarks[metric];
  const isHigher = b.higherIsBetter !== false;
  const userPct = normMetric(metric, value);
  const jvPct = normMetric(metric, b.jv);
  const color = value === 0 ? "var(--dim)" : userPct >= 95 ? "var(--green)" : userPct >= jvPct ? "var(--blue)" : "var(--gold)";
  const displayVal = value === 0 ? "—" : `${value}${b.unit === "%" ? "%" : ` ${b.unit}`}`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-[color:var(--foreground)]">{b.label}</span>
        <span className="font-mono text-[12px]" style={{ color }}>{displayVal}</span>
      </div>
      <div className="relative h-[8px] overflow-hidden rounded-full bg-[rgba(245,236,216,0.06)]">
        <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(userPct, 100)}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
        <span className="absolute top-0 h-full w-[1.5px] bg-[rgba(245,236,216,0.35)]" style={{ left: `${jvPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.1em] text-[color:var(--dim)]">
        <span>F: {isHigher ? b.freshman : b.varsity}{b.unit === "%" ? "%" : b.unit}</span>
        <span>JV: {b.jv}{b.unit === "%" ? "%" : b.unit}</span>
        <span>V: {isHigher ? b.varsity : b.freshman}{b.unit === "%" ? "%" : b.unit}</span>
      </div>
    </div>
  );
}

function Gauge({ score, size = 160 }: { score: number; size?: number }) {
  const safe = Math.max(0, Math.min(100, score));
  const label = safe >= 80 ? "Varsity ready" : safe >= 60 ? "Approaching" : safe >= 40 ? "Building base" : "Early stage";
  const color = safe >= 72 ? "var(--green)" : safe >= 44 ? "var(--gold)" : "var(--dim)";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size, flexShrink: 0 }}>
      <div className="gauge-glow absolute inset-2 rounded-full blur-lg"
        style={{ background: `conic-gradient(${color}55 0 ${safe}%, transparent ${safe}% 100%)` }} />
      <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${color} 0 ${safe}%, rgba(245,236,216,0.07) ${safe}% 100%)` }} />
      <div className="absolute rounded-full border border-[rgba(245,236,216,0.07)] bg-[rgba(10,11,8,0.95)]" style={{ inset: size / 14 }} />
      <div className="relative z-10 text-center">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[color:var(--muted)]">Readiness</p>
        <p className="font-black leading-none tracking-[-0.08em]" style={{ fontSize: size * 0.27, color: safe >= 10 ? "var(--foreground)" : "var(--dim)" }}>{safe}</p>
        <p className="font-black uppercase tracking-[0.18em]" style={{ fontSize: 8, color, marginTop: 2 }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
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
  const form = useForm<AuthFormData>({ resolver: zodResolver(authSchema), defaultValues: { email: "", password: "" } });
  return (
    <div className="phone-shell" style={{ background: "var(--background)" }}>
      <div className="phone-column" style={{ justifyContent: "center", padding: "0 20px", paddingTop: "calc(40px + env(safe-area-inset-top,0px))", paddingBottom: "calc(24px + env(safe-area-inset-bottom,0px))" }}>
        <div className="noise-layer" />
        <div className="relative z-10 w-full">
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] border"
              style={{ borderColor: "rgba(132,181,109,0.3)", background: "rgba(26,28,18,0.98)", boxShadow: "0 0 44px rgba(132,181,109,0.12)" }}>
              <Image src="/varfoot-mark.svg" alt="VarFoot" width={44} height={44} priority />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.36em] text-[color:var(--green)]">VarFoot</p>
              <h1 className="mt-1.5 text-[30px] font-black leading-tight tracking-[-0.06em]">
                {mode === "sign-in" ? "Welcome back." : "Start your journey."}
              </h1>
              <p className="mt-1.5 text-[14px] text-[color:var(--muted)]">
                {mode === "sign-in" ? "Pick up where you left off." : "Track gaps. Close the distance."}
              </p>
            </div>
          </div>
          <div className="paper-shell rounded-[24px] p-5">
            <form className="space-y-3.5" onSubmit={form.handleSubmit(async v => { await onSubmit(mode, v.email.trim().toLowerCase(), v.password); })}>
              <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Email
                <input className="paper-field h-12 px-4 text-[14px] font-semibold" placeholder="you@example.com"
                  autoComplete="email" autoCapitalize="none" inputMode="email" {...form.register("email")} />
                {form.formState.errors.email && <span className="text-[11px] font-bold text-[color:var(--red)]">{form.formState.errors.email.message}</span>}
              </label>
              <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Password
                <input type="password" className="paper-field h-12 px-4 text-[14px] font-semibold"
                  placeholder="Min 8 characters" autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  {...form.register("password")} />
                {form.formState.errors.password && <span className="text-[11px] font-bold text-[color:var(--red)]">{form.formState.errors.password.message}</span>}
              </label>
              {error && <div className="rounded-[12px] border border-[rgba(215,121,109,0.3)] bg-[rgba(215,121,109,0.1)] px-4 py-3 text-[13px] text-[color:var(--red)]">{error}</div>}
              <button type="submit" disabled={loading} className="paper-button-primary mt-1 flex h-12 w-full items-center justify-center rounded-[14px] text-[14px]">
                {loading ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            </form>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => { setMode(m => m === "sign-in" ? "sign-up" : "sign-in"); form.reset(); }}
              className="paper-chip rounded-full px-4 py-2 text-[11px] font-black">
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

// ─── Onboarding Wizard ────────────────────────────────────────────────────────
function OnboardingWizard({ onComplete, onSkip }: {
  onComplete: (data: OnboardData) => Promise<void>;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<OnboardStep>(1);
  const [data, setData] = useState<OnboardData>({
    name: "", age: "", school: "", position: "", seasonGoal: "",
    pushups: "", plankSeconds: "", wallSitSeconds: "",
    passing: "", shooting: "", dribbling: "", firstTouch: "", speed: "",
  });
  function patch(k: keyof OnboardData, v: string) { setData(p => ({ ...p, [k]: v })); }

  if (step === 4) {
    return (
      <div className="phone-shell" style={{ background: "var(--background)" }}>
        <div className="phone-column" style={{ justifyContent: "center", alignItems: "center" }}>
          <div className="noise-layer" />
          <div className="relative z-10 flex flex-col items-center gap-5 px-8 text-center">
            <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[22px] border"
              style={{ borderColor: "rgba(132,181,109,0.3)", background: "rgba(26,28,18,0.98)" }}>
              <Image src="/varfoot-mark.svg" alt="" width={38} height={38} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[color:var(--green)]">Building your roadmap</p>
              <h2 className="mt-2 text-[26px] font-black tracking-[-0.05em]">Analyzing your gaps…</h2>
              <p className="mt-2 text-[14px] text-[color:var(--muted)]">Personalizing your 6-week plan</p>
            </div>
            <div className="flex gap-1.5">
              <span className="bounce-dot h-2.5 w-2.5 rounded-full bg-[color:var(--green)]" />
              <span className="bounce-dot h-2.5 w-2.5 rounded-full bg-[color:var(--green)]" />
              <span className="bounce-dot h-2.5 w-2.5 rounded-full bg-[color:var(--green)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canNext1 = data.name.trim().length >= 2;
  const canNext2 = data.pushups !== "" && data.plankSeconds !== "" && data.wallSitSeconds !== "";
  const canNext3 = data.passing !== "" && data.shooting !== "" && data.dribbling !== "" && data.firstTouch !== "" && data.speed !== "";

  return (
    <div className="phone-shell" style={{ background: "var(--background)" }}>
      <div className="phone-column scrollbar-none" style={{ overflowY: "auto" }}>
        <div className="noise-layer" />
        <div className="relative z-10 flex min-h-full flex-col px-5"
          style={{ paddingTop: "calc(28px + env(safe-area-inset-top,0px))", paddingBottom: "calc(28px + env(safe-area-inset-bottom,0px))" }}>

          {/* Step indicator */}
          <div className="mb-7 flex items-center gap-2.5">
            {step > 1 && (
              <button type="button" onClick={() => setStep(s => (s - 1) as OnboardStep)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(245,236,216,0.11)] text-[color:var(--muted)]">
                <CaretLeft size={16} weight="bold" />
              </button>
            )}
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: n === step ? 28 : 10, background: n < step ? "var(--green)" : n === step ? "var(--green)" : "rgba(245,236,216,0.12)" }} />
              ))}
            </div>
            <span className="ml-auto text-[11px] font-black uppercase tracking-[0.18em] text-[color:var(--dim)]">
              {step} / 3
            </span>
          </div>

          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="flex-1 space-y-5">
              <div>
                <Eyebrow tone="green">Step 1 · Profile</Eyebrow>
                <h2 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.06em]">Let&apos;s build your roadmap.</h2>
                <p className="mt-1.5 text-[14px] text-[color:var(--muted)]">Tell us who you are so we can personalize your plan.</p>
              </div>
              <div className="space-y-3">
                <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Your name *
                  <input className="paper-field h-11 px-3.5 text-[14px] font-semibold" placeholder="First name"
                    value={data.name} onChange={e => patch("name", e.target.value)} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    Age
                    <input type="number" inputMode="numeric" className="paper-field h-11 px-3.5 text-[14px] font-semibold" placeholder="16"
                      value={data.age} onChange={e => patch("age", e.target.value)} />
                  </label>
                  <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    Position
                    <select className="paper-field h-11 px-3 text-[13px]" value={data.position} onChange={e => patch("position", e.target.value)}>
                      <option value="">Select…</option>
                      {["Goalkeeper", "Center Back", "Fullback", "Defensive Mid", "Central Mid", "Attacking Mid", "Winger", "Striker"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  School
                  <input className="paper-field h-11 px-3.5 text-[14px] font-semibold" placeholder="e.g. Lexington High"
                    value={data.school} onChange={e => patch("school", e.target.value)} />
                </label>
                <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Season goal
                  <textarea rows={2} className="paper-field resize-none px-3.5 py-2.5 text-[14px] font-semibold"
                    placeholder="e.g. Make varsity by spring tryouts"
                    value={data.seasonGoal} onChange={e => patch("seasonGoal", e.target.value)} />
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Physical */}
          {step === 2 && (
            <div className="flex-1 space-y-4">
              <div>
                <Eyebrow tone="gold">Step 2 · Physical tests</Eyebrow>
                <h2 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.06em]">How&apos;s your body?</h2>
                <p className="mt-1.5 text-[14px] text-[color:var(--muted)]">Complete each test and enter your best result.</p>
              </div>
              {([
                { key: "pushups", label: "Pushups", unit: "reps", Icon: Barbell, note: "Max reps without stopping. Chest to floor each rep." },
                { key: "plankSeconds", label: "Plank hold", unit: "sec", Icon: Lightning, note: "Straight-arm plank. Enter total seconds held." },
                { key: "wallSitSeconds", label: "Wall sit", unit: "sec", Icon: Barbell, note: "90° knee angle, back flat. Enter total seconds held." },
              ] as const).map(({ key, label, unit, Icon, note }) => (
                <Card key={key} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
                      style={{ background: "rgba(210,160,74,0.14)", color: "var(--gold)" }}>
                      <Icon size={20} weight="bold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-black tracking-[-0.03em]">{label}</p>
                      <p className="mt-0.5 text-[12px] text-[color:var(--muted)]">{note}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" inputMode="numeric" className="paper-field h-11 flex-1 px-3.5 text-[14px] font-semibold"
                      placeholder="Your result" value={data[key]} onChange={e => patch(key, e.target.value)} />
                    <span className="w-8 shrink-0 text-[12px] font-black text-[color:var(--dim)]">{unit}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Step 3: Technical */}
          {step === 3 && (
            <div className="flex-1 space-y-3">
              <div>
                <Eyebrow tone="blue">Step 3 · Technical tests</Eyebrow>
                <h2 className="mt-2 text-[26px] font-black leading-tight tracking-[-0.06em]">Ball skills on paper.</h2>
                <p className="mt-1.5 text-[14px] text-[color:var(--muted)]">Need a ball for each. Enter your best attempt.</p>
              </div>
              {([
                { key: "passing", label: "Wall pass accuracy", unit: "%", note: "10 inside-foot passes at a wall. How many were clean?" },
                { key: "shooting", label: "Shooting accuracy", unit: "%", note: "10 shots from penalty spot. How many hit the frame?" },
                { key: "dribbling", label: "Cone slalom time", unit: "sec", note: "6 cones, 1 stride apart. Fastest clean run (seconds)." },
                { key: "firstTouch", label: "Clean first touches", unit: "%", note: "10 wall rebounds. How many stayed in control first touch?" },
                { key: "speed", label: "20-yard sprint", unit: "sec", note: "Timed 20-yard dash. Enter fastest time, e.g. 4.2." },
              ] as const).map(({ key, label, unit, note }) => (
                <SoftCard key={key} className="space-y-2.5">
                  <div>
                    <p className="text-[14px] font-black tracking-[-0.03em]">{label}</p>
                    <p className="mt-0.5 text-[12px] text-[color:var(--muted)]">{note}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" inputMode="decimal" className="paper-field h-11 flex-1 px-3.5 text-[14px] font-semibold"
                      placeholder="Your result" value={data[key]} onChange={e => patch(key, e.target.value)} />
                    <span className="w-8 shrink-0 text-[12px] font-black text-[color:var(--dim)]">{unit}</span>
                  </div>
                </SoftCard>
              ))}
            </div>
          )}

          {/* Bottom actions */}
          <div className="mt-8 space-y-3">
            {step === 1 && (
              <>
                <button type="button" disabled={!canNext1} onClick={() => setStep(2)}
                  className="paper-button-primary flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[14px]">
                  Continue <ArrowRight size={16} weight="bold" />
                </button>
                <button type="button" onClick={onSkip}
                  className="flex h-11 w-full items-center justify-center text-[12px] font-black uppercase tracking-[0.16em] text-[color:var(--dim)]">
                  Skip — load demo data
                </button>
              </>
            )}
            {step === 2 && (
              <button type="button" disabled={!canNext2} onClick={() => setStep(3)}
                className="paper-button-primary flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[14px]">
                Next: Technical tests <ArrowRight size={16} weight="bold" />
              </button>
            )}
            {step === 3 && (
              <button type="button" disabled={!canNext3}
                onClick={() => { setStep(4); void onComplete(data); }}
                className="paper-button-primary flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px]">
                Generate my plan <ArrowRight size={16} weight="bold" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App Bar ──────────────────────────────────────────────────────────────────
function AppBar({ title, playerName, syncState, onAvatarTap }: {
  title: string; playerName: string; syncState: string; onAvatarTap: () => void;
}) {
  const initials = playerName.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "VA";
  const syncColor = syncState === "synced" ? "var(--green)" : syncState === "saving" ? "var(--gold)" : syncState === "error" ? "var(--red)" : undefined;
  return (
    <div className="app-bar">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border"
          style={{ borderColor: "rgba(245,236,216,0.11)", background: "rgba(26,28,18,0.96)" }}>
          <Image src="/varfoot-mark.svg" alt="" width={18} height={18} />
        </div>
        <span className="text-[17px] font-black tracking-[-0.03em]">{title}</span>
        {syncColor && <span className="h-1.5 w-1.5 rounded-full" style={{ background: syncColor }} />}
      </div>
      <button type="button" onClick={onAvatarTap}
        className="flex h-9 w-9 items-center justify-center rounded-full border text-[13px] font-black transition"
        style={{ borderColor: "rgba(245,236,216,0.14)", background: "rgba(34,36,26,0.96)", color: "var(--muted)" }}>
        {initials}
      </button>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ active, onSelect }: { active: NavTab; onSelect: (t: NavTab) => void }) {
  return (
    <div className="bottom-nav">
      <div className="nav-grid">
        {NAV.map(({ key, label, Icon }) => {
          const isActive = key === active;
          return (
            <button key={key} type="button" className="nav-item" onClick={() => onSelect(key)}>
              <span className="nav-dot" style={{ background: isActive ? "var(--green)" : "transparent", opacity: isActive ? 1 : 0 }} />
              <Icon size={22} weight={isActive ? "fill" : "regular"} style={{ color: isActive ? "var(--green)" : "var(--dim)" }} />
              <span className="nav-label" style={{ color: isActive ? "var(--green)" : "var(--dim)" }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Profile Sheet ────────────────────────────────────────────────────────────
function ProfileSheet({ state, localMode, syncState, onSignOut, onLoadDemo, onReset, onClose }: {
  state: AppState; localMode: boolean; syncState: string;
  onSignOut: () => Promise<void>; onLoadDemo: () => void; onReset: () => void; onClose: () => void;
}) {
  const syncLabel: Record<string, string> = {
    local: "Local only", loading: "Loading…", saving: "Saving…",
    synced: "Cloud synced", error: "Sync error", "signed-out": "Signed out",
  };
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[430px] mx-auto rounded-t-[28px] border border-[rgba(245,236,216,0.11)]"
        style={{ background: "rgba(12,13,10,0.98)", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 20px)" }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-9 rounded-full bg-[rgba(245,236,216,0.18)]" />
        </div>
        <div className="px-5 pt-3 pb-2">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full border text-[18px] font-black"
              style={{ borderColor: "rgba(132,181,109,0.22)", background: "rgba(26,28,18,0.96)", color: "var(--foreground)" }}>
              {(state.assessment.name || "VA").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[19px] font-black tracking-[-0.04em]">{state.assessment.name || "Athlete"}</p>
              <p className="truncate text-[13px] text-[color:var(--muted)]">{state.assessment.school || "—"} · {state.assessment.position || "—"}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--dim)]">{syncLabel[syncState] ?? syncState}</p>
            </div>
          </div>
          <div className="space-y-2">
            <button type="button" onClick={onLoadDemo}
              className="paper-button-primary flex h-12 w-full items-center justify-center rounded-[14px] text-[14px]">
              Load demo athlete
            </button>
            <button type="button" onClick={onReset}
              className="paper-button-secondary flex h-12 w-full items-center justify-center rounded-[14px] text-[14px]">
              Reset all data
            </button>
            {!localMode && (
              <button type="button" onClick={() => void onSignOut()}
                className="flex h-12 w-full items-center justify-center rounded-[14px] border text-[14px] font-black"
                style={{ borderColor: "rgba(215,121,109,0.26)", background: "rgba(215,121,109,0.08)", color: "var(--red)" }}>
                Sign out
              </button>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="mt-4 flex h-10 w-full items-center justify-center text-[12px] font-black uppercase tracking-[0.14em] text-[color:var(--dim)]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ state, scores, nutritionTotals, onGoToStats, onGoToPlan, onGeneratePlan, planLoading }: {
  state: AppState; scores: ReturnType<typeof getAssessmentScores>;
  nutritionTotals: ReturnType<typeof getNutritionTotals>;
  onGoToStats: () => void; onGoToPlan: () => void;
  onGeneratePlan: () => Promise<void>; planLoading: boolean;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Up early" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (state.assessment.name || "Athlete").split(" ")[0];
  const topGaps = scores.gaps.slice(0, 2);
  const selectedWeek = state.plan.weeks.find(w => w.week === state.selectedWeek) ?? state.plan.weeks[0];
  const nextSession = selectedWeek?.sessions.find(s => s.status === "today") ?? selectedWeek?.sessions[0];
  const calPct = Math.min(1, nutritionTotals.calories / state.nutrition.calorieTarget);
  const hasData = state.onboardingComplete;

  return (
    <div className="tab-enter space-y-3.5 px-4 pb-6 pt-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[color:var(--dim)]">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </p>
        <h2 className="mt-0.5 text-[28px] font-black tracking-[-0.05em]">
          {greeting}{hasData ? `, ${firstName}.` : "."}
        </h2>
      </div>

      {!hasData ? (
        <>
          <div className="flex justify-center py-4">
            <Gauge score={0} size={180} />
          </div>
          <Card>
            <Eyebrow tone="green">Get started</Eyebrow>
            <h3 className="mt-1.5 text-[20px] font-black tracking-[-0.05em]">Build your roadmap.</h3>
            <p className="mt-2 text-[13px] leading-5 text-[color:var(--muted)]">
              Complete a 3-minute assessment to compare your skills against varsity benchmarks and get a personalized 6-week training plan.
            </p>
            <button type="button" onClick={onGoToStats}
              className="paper-button-primary mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[13px] text-[14px]">
              View benchmarks <ArrowRight size={15} weight="bold" />
            </button>
          </Card>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Gauge score={Math.round(scores.overallScore)} size={156} />
            <div className="flex-1 min-w-0 space-y-2">
              <Stat label="Top gap" value={topGaps[0]?.label ?? "—"} tone="gold" compact />
              <Stat label="Fuel today" value={`${nutritionTotals.calories} kcal`}
                tone={calPct >= 0.8 ? "green" : calPct >= 0.5 ? "gold" : "neutral"} compact />
              {state.assessment.seasonGoal && (
                <Stat label="Goal" value={state.assessment.seasonGoal.slice(0, 28) + (state.assessment.seasonGoal.length > 28 ? "…" : "")} tone="neutral" compact />
              )}
            </div>
          </div>

          {nextSession && (
            <button type="button" onClick={onGoToPlan} className="w-full text-left">
              <SoftCard className="transition active:scale-[0.98]">
                <Eyebrow>Today&apos;s session</Eyebrow>
                <div className="mt-2 flex items-start gap-3">
                  <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[13px]"
                    style={{ background: "rgba(132,181,109,0.14)" }}>
                    <Timer size={20} weight="bold" style={{ color: "var(--green)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-black tracking-[-0.04em]">{nextSession.title}</p>
                    <p className="text-[13px] text-[color:var(--muted)]">{nextSession.drill}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="paper-chip rounded-full px-2.5 py-1 text-[10px] font-black">{nextSession.day}</span>
                      <span className="paper-chip rounded-full px-2.5 py-1 text-[10px] font-black">{nextSession.duration}</span>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-black border"
                        style={{ background: "rgba(132,181,109,0.14)", color: "var(--green)", borderColor: "rgba(132,181,109,0.3)" }}>
                        {nextSession.focus}
                      </span>
                    </div>
                  </div>
                </div>
              </SoftCard>
            </button>
          )}

          {topGaps.length > 0 && (
            <div>
              <Eyebrow>Top gaps to close</Eyebrow>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {topGaps.map(gap => (
                  <SoftCard key={gap.metric} className="py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--dim)]">{gap.label}</p>
                    <p className="mt-1 text-[32px] font-black leading-none tracking-[-0.07em]">
                      {Math.round(gap.score)}<span className="text-[13px] text-[color:var(--dim)]">%</span>
                    </p>
                    <p className="mt-1 text-[11px] text-[color:var(--muted)]">{gap.higherIsBetter ? "Push higher ↑" : "Push lower ↓"}</p>
                  </SoftCard>
                ))}
              </div>
            </div>
          )}

          {selectedWeek && (
            <button type="button" onClick={onGoToPlan} className="w-full text-left">
              <Card className="transition active:scale-[0.98]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Eyebrow tone="green">Week {selectedWeek.week} · {selectedWeek.label}</Eyebrow>
                    <p className="mt-1 text-[13px] leading-5 text-[color:var(--muted)]">{selectedWeek.readinessNote}</p>
                  </div>
                  <ArrowRight size={18} weight="bold" style={{ color: "var(--dim)", flexShrink: 0 }} />
                </div>
              </Card>
            </button>
          )}

          <button type="button" onClick={() => void onGeneratePlan()} disabled={planLoading}
            className="paper-button-secondary flex h-11 w-full items-center justify-center rounded-[14px] text-[13px]">
            {planLoading ? "Regenerating…" : "Regenerate training plan"}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────
function StatsTab({ state, scores, onAssessmentChange, onGeneratePlan, onToggleDrill, planLoading }: {
  state: AppState; scores: ReturnType<typeof getAssessmentScores>;
  onAssessmentChange: (key: keyof AppState["assessment"], value: string) => void;
  onGeneratePlan: () => Promise<void>; onToggleDrill: (name: string) => void; planLoading: boolean;
}) {
  const [section, setSection] = useState<DashSection>("benchmark");
  const SECTIONS: Array<{ key: DashSection; label: string }> = [
    { key: "benchmark", label: "Benchmark" },
    { key: "assess", label: "Assessment" },
    { key: "library", label: "Drills" },
  ];
  const TECH: MetricKey[] = ["passing", "shooting", "dribbling", "firstTouch", "speed"];
  const PHYS: MetricKey[] = ["pushups", "plankSeconds", "wallSitSeconds"];

  return (
    <div className="tab-enter space-y-3 px-4 pb-6 pt-3">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {SECTIONS.map(s => (
          <button key={s.key} type="button" onClick={() => setSection(s.key)}
            className={cn("shrink-0 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] transition",
              section === s.key ? "paper-chip-active" : "paper-chip")}>
            {s.label}
          </button>
        ))}
      </div>

      {section === "benchmark" && (
        <div className="space-y-3">
          <Card>
            <div className="flex items-center gap-5">
              <Gauge score={Math.round(scores.overallScore)} size={148} />
              <div className="flex-1 space-y-3">
                <div>
                  <Eyebrow tone="green">Technical</Eyebrow>
                  <p className="text-[32px] font-black leading-none tracking-[-0.07em]">
                    {Math.round(scores.technicalScore)}<span className="text-[14px] font-bold text-[color:var(--dim)]">/100</span>
                  </p>
                </div>
                <div>
                  <Eyebrow tone="gold">Physical</Eyebrow>
                  <p className="text-[32px] font-black leading-none tracking-[-0.07em]">
                    {Math.round(scores.physicalScore)}<span className="text-[14px] font-bold text-[color:var(--dim)]">/100</span>
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <Eyebrow tone="green">Technical — vs varsity targets</Eyebrow>
            <div className="mt-4 space-y-5">
              {TECH.map(m => <BenchmarkBar key={m} metric={m} value={state.assessment[m] as number} />)}
            </div>
          </Card>
          <Card>
            <Eyebrow tone="gold">Physical — vs varsity targets</Eyebrow>
            <div className="mt-4 space-y-5">
              {PHYS.map(m => <BenchmarkBar key={m} metric={m} value={state.assessment[m] as number} />)}
            </div>
          </Card>
        </div>
      )}

      {section === "assess" && (
        <div className="space-y-3">
          <Card>
            <Eyebrow tone="green">Profile</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {([
                { key: "name", label: "Name", span: true, type: "text" },
                { key: "age", label: "Age", span: false, type: "number" },
                { key: "school", label: "School", span: false, type: "text" },
                { key: "position", label: "Position", span: false, type: "text" },
                { key: "height", label: "Height", span: false, type: "text" },
                { key: "weight", label: "Weight", span: false, type: "text" },
                { key: "seasonGoal", label: "Season goal", span: true, type: "text" },
              ] as const).map(({ key, label, span, type }) => (
                <label key={key} className={cn("grid gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]", span && "col-span-2")}>
                  {label}
                  <input type={type} className="paper-field h-10 px-3 text-[13px] font-semibold"
                    value={state.assessment[key]} onChange={e => onAssessmentChange(key, e.target.value)} />
                </label>
              ))}
            </div>
          </Card>
          <Card>
            <Eyebrow tone="gold">Physical tests</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {PHYS.map(metric => (
                <label key={metric} className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  {assessmentBenchmarks[metric].label}
                  <div className="flex items-center gap-1">
                    <input type="number" inputMode="numeric" className="paper-field h-10 flex-1 px-3 text-[13px] font-semibold"
                      value={state.assessment[metric]} onChange={e => onAssessmentChange(metric, e.target.value)} />
                    <span className="shrink-0 text-[10px] text-[color:var(--dim)]">{assessmentBenchmarks[metric].unit}</span>
                  </div>
                </label>
              ))}
            </div>
          </Card>
          <Card>
            <Eyebrow tone="green">Technical tests</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {TECH.map(metric => (
                <label key={metric} className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  {assessmentBenchmarks[metric].label}
                  <div className="flex items-center gap-1">
                    <input type="number" inputMode="decimal" className="paper-field h-10 flex-1 px-3 text-[13px] font-semibold"
                      value={state.assessment[metric]} onChange={e => onAssessmentChange(metric, e.target.value)} />
                    <span className="shrink-0 text-[10px] text-[color:var(--dim)]">{assessmentBenchmarks[metric].unit}</span>
                  </div>
                </label>
              ))}
            </div>
          </Card>
          <button type="button" onClick={() => void onGeneratePlan()} disabled={planLoading}
            className="paper-button-primary flex h-12 w-full items-center justify-center rounded-[14px] text-[14px]">
            {planLoading ? "Building plan…" : "Re-score & generate plan"}
          </button>
        </div>
      )}

      {section === "library" && (
        <div className="space-y-3">
          {drillLibrary.map(drill => {
            const saved = state.library.savedDrills.includes(drill.name);
            return (
              <Card key={drill.name}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <Eyebrow tone="green">{drill.focus}</Eyebrow>
                    <h3 className="mt-1 text-[17px] font-black tracking-[-0.04em]">{drill.name}</h3>
                    <p className="mt-1.5 text-[13px] leading-5 text-[color:var(--muted)]">{drill.instructions}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="paper-chip rounded-full px-2.5 py-1 text-[10px] font-black">{drill.duration}</span>
                      <span className="paper-chip rounded-full px-2.5 py-1 text-[10px] font-black">{drill.equipment}</span>
                    </div>
                    <p className="mt-2 text-[11px] font-bold" style={{ color: "var(--green)" }}>Target: {drill.target}</p>
                  </div>
                  <button type="button" onClick={() => onToggleDrill(drill.name)}
                    className={cn("shrink-0 rounded-[11px] border px-3 py-1.5 text-[11px] font-black transition",
                      saved ? "border-[rgba(132,181,109,0.38)] bg-[rgba(132,181,109,0.16)] text-[color:var(--green)]" : "paper-chip")}>
                    {saved ? "✓ Saved" : "Save"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Plan Tab ─────────────────────────────────────────────────────────────────
function PlanTab({ state, selectedWeek, onSelectWeek, onGeneratePlan, planLoading, planSummary }: {
  state: AppState; selectedWeek: AppState["plan"]["weeks"][number] | undefined;
  onSelectWeek: (w: number) => void; onGeneratePlan: () => Promise<void>;
  planLoading: boolean; planSummary: string | null;
}) {
  const statusColor: Record<string, string> = { done: "var(--green)", today: "var(--gold)", queued: "var(--dim)" };
  const statusLabel: Record<string, string> = { done: "Done", today: "Today", queued: "Up next" };

  if (!state.plan.weeks.length) {
    return (
      <div className="tab-enter space-y-4 px-4 pb-6 pt-3">
        <h2 className="text-[26px] font-black tracking-[-0.05em]">Training Plan</h2>
        <Card>
          <div className="py-6 text-center">
            <ChartLineUp size={48} weight="light" style={{ margin: "0 auto", color: "var(--dim)" }} />
            <p className="mt-3 text-[18px] font-black tracking-[-0.04em]">No plan yet</p>
            <p className="mt-2 text-[13px] leading-5 text-[color:var(--muted)]">
              Complete the assessment in Stats → Assessment to generate your personalized 6-week varsity roadmap.
            </p>
            <button type="button" onClick={() => void onGeneratePlan()} disabled={planLoading}
              className="paper-button-primary mt-5 flex h-11 w-full items-center justify-center rounded-[13px] text-[14px]">
              {planLoading ? "Generating…" : "Generate plan"}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="tab-enter space-y-3 px-4 pb-6 pt-3">
      <div>
        <h2 className="text-[26px] font-black tracking-[-0.05em]">Training Plan</h2>
        <p className="text-[13px] text-[color:var(--muted)]">6-week varsity roadmap</p>
      </div>

      {planSummary && (
        <div className="rounded-[20px] border p-4"
          style={{ borderColor: "rgba(132,181,109,0.22)", background: "linear-gradient(145deg, rgba(132,181,109,0.09), rgba(16,17,12,0.98))" }}>
          <Eyebrow tone="green">AI Coach</Eyebrow>
          <p className="mt-2 text-[14px] leading-[1.5] text-[color:var(--foreground)]">{planSummary}</p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {state.plan.weeks.map(week => (
          <button key={week.week} type="button" onClick={() => onSelectWeek(week.week)}
            className={cn("shrink-0 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition",
              week.week === state.selectedWeek ? "paper-chip-active" : "paper-chip")}>
            Wk {week.week}
          </button>
        ))}
      </div>

      {selectedWeek && (
        <>
          <Card>
            <Eyebrow tone="green">Week {selectedWeek.week} · {selectedWeek.emphasis}</Eyebrow>
            <h3 className="mt-1 text-[20px] font-black tracking-[-0.05em]">{selectedWeek.label}</h3>
            <p className="mt-1.5 text-[13px] leading-5 text-[color:var(--muted)]">{selectedWeek.readinessNote}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="paper-chip rounded-full px-3 py-1.5 text-[10px] font-black">{selectedWeek.sessions.length} sessions</span>
              <span className="paper-chip rounded-full px-3 py-1.5 text-[10px] font-black">Focus: {selectedWeek.emphasis}</span>
            </div>
          </Card>

          {selectedWeek.sessions.map(session => (
            <SoftCard key={`${session.day}-${session.title}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] text-[12px] font-black"
                  style={{ background: `${statusColor[session.status]}18`, color: statusColor[session.status] }}>
                  {session.day}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] font-black tracking-[-0.03em]">{session.title}</p>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]"
                      style={{ color: statusColor[session.status], background: `${statusColor[session.status]}18`, border: `1px solid ${statusColor[session.status]}38` }}>
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
      )}

      <button type="button" onClick={() => void onGeneratePlan()} disabled={planLoading}
        className="paper-button-secondary flex h-11 w-full items-center justify-center rounded-[14px] text-[13px]">
        {planLoading ? "Regenerating…" : "Regenerate plan"}
      </button>
    </div>
  );
}

// ─── Fuel Tab ─────────────────────────────────────────────────────────────────
const mealSchema = z.object({ meal: z.enum(["Breakfast", "Lunch", "Snack", "Dinner"]), food: z.string().min(1) });
type MealForm = z.infer<typeof mealSchema>;

function FuelTab({ state, totals, onAddMeal }: {
  state: AppState; totals: ReturnType<typeof getNutritionTotals>;
  onAddMeal: (meal: FoodEntry["meal"], food: string) => void;
}) {
  const form = useForm<MealForm>({ resolver: zodResolver(mealSchema), defaultValues: { meal: "Breakfast", food: foodCatalog[0]?.name ?? "" } });
  const calPct = Math.min(100, (totals.calories / state.nutrition.calorieTarget) * 100);
  const protPct = Math.min(100, (totals.protein / state.nutrition.proteinTarget) * 100);
  const carbPct = Math.min(100, (totals.carbs / state.nutrition.carbTarget) * 100);
  const fatPct = Math.min(100, (totals.fat / state.nutrition.fatTarget) * 100);

  return (
    <div className="tab-enter space-y-3 px-4 pb-6 pt-3">
      <div>
        <h2 className="text-[26px] font-black tracking-[-0.05em]">Fuel</h2>
        <p className="text-[13px] text-[color:var(--muted)]">Today&apos;s nutrition</p>
      </div>

      <Card>
        <Eyebrow tone="green">Calories</Eyebrow>
        <div className="mt-2 flex items-end gap-2 leading-none">
          <span className="text-[44px] font-black tracking-[-0.08em]">{totals.calories}</span>
          <span className="mb-1.5 text-[13px] text-[color:var(--dim)]">/ {state.nutrition.calorieTarget}</span>
        </div>
        <div className="mt-3 h-[7px] overflow-hidden rounded-full bg-[rgba(245,236,216,0.06)]">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${calPct}%`, background: "var(--green)" }} />
        </div>
        <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--dim)]">kcal daily target</p>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Protein", val: totals.protein, target: state.nutrition.proteinTarget, pct: protPct, color: "var(--blue)" },
          { label: "Carbs", val: totals.carbs, target: state.nutrition.carbTarget, pct: carbPct, color: "var(--gold)" },
          { label: "Fat", val: totals.fat, target: state.nutrition.fatTarget, pct: fatPct, color: "var(--muted)" },
        ].map(({ label, val, target, pct, color }) => (
          <SoftCard key={label} className="py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[color:var(--dim)]">{label}</p>
            <p className="mt-1 text-[22px] font-black leading-none tracking-[-0.06em]">{val}<span className="text-[11px] font-bold text-[color:var(--dim)]">g</span></p>
            <div className="mt-2 h-[4px] overflow-hidden rounded-full bg-[rgba(245,236,216,0.06)]">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-[color:var(--dim)]">{target}g target</p>
          </SoftCard>
        ))}
      </div>

      <Card>
        <Eyebrow tone="green">Log food</Eyebrow>
        <form className="mt-3 space-y-3" onSubmit={form.handleSubmit(v => { onAddMeal(v.meal, v.food); form.reset({ meal: v.meal, food: v.food }); })}>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Meal <select className="paper-field h-10 px-3 text-[13px]" {...form.register("meal")}>
                <option>Breakfast</option><option>Lunch</option><option>Snack</option><option>Dinner</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Food <select className="paper-field h-10 px-3 text-[13px]" {...form.register("food")}>
                {foodCatalog.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {foodCatalog.slice(0, 4).map(item => (
              <button key={item.name} type="button" onClick={() => form.setValue("food", item.name)}
                className="paper-chip rounded-full px-3 py-1.5 text-[10px] font-black">{item.name}</button>
            ))}
          </div>
          <button type="submit" className="paper-button-primary flex h-10 w-full items-center justify-center rounded-[12px] text-[13px]">
            Add entry
          </button>
        </form>
      </Card>

      {state.nutrition.entries.length > 0 && (
        <div className="space-y-2">
          <Eyebrow>{state.nutrition.entries.length} {state.nutrition.entries.length === 1 ? "entry" : "entries"} today</Eyebrow>
          {state.nutrition.entries.slice(0, 10).map(entry => (
            <SoftCard key={entry.id} className="py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-black">{entry.name}</p>
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
      )}
    </div>
  );
}

// ─── Coach Tab ────────────────────────────────────────────────────────────────
const coachSchema = z.object({ prompt: z.string().min(2).max(240) });
type CoachForm = z.infer<typeof coachSchema>;

function CoachTab({ state, onSend, busy }: { state: AppState; onSend: (p: string) => Promise<void>; busy: boolean }) {
  const form = useForm<CoachForm>({ resolver: zodResolver(coachSchema), defaultValues: { prompt: "" } });
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.coach.messages, busy]);

  return (
    <div className="tab-enter flex h-full flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-2 scrollbar-none">
        <div className="mb-3">
          <h2 className="text-[26px] font-black tracking-[-0.05em]">AI Coach</h2>
          <p className="text-[13px] text-[color:var(--muted)]">Personalized to your gaps and plan</p>
        </div>

        {state.coach.messages.length === 0 && (
          <Card className="py-7 text-center">
            <ChatsCircle size={44} weight="light" style={{ margin: "0 auto", color: "var(--dim)" }} />
            <p className="mt-3 text-[16px] font-black tracking-[-0.03em]">Ask your coach anything</p>
            <p className="mt-1.5 text-[13px] leading-5 text-[color:var(--muted)]">Training advice, nutrition tips, plan adjustments — specific to your benchmark scores.</p>
          </Card>
        )}

        <div className="space-y-2.5">
          {state.coach.messages.map(msg => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[84%] rounded-[18px] px-4 py-3 text-[14px] leading-[1.45]", msg.role === "user" ? "border" : "paper-card-soft")}
                style={msg.role === "user" ? { background: "rgba(132,181,109,0.16)", borderColor: "rgba(132,181,109,0.28)", color: "var(--foreground)" } : undefined}>
                {msg.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="paper-card-soft rounded-[18px] px-4 py-3">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => <span key={i} className="bounce-dot h-2 w-2 rounded-full bg-[color:var(--dim)]" />)}
                </div>
              </div>
            </div>
          )}
        </div>

        {!busy && (
          <div className="mt-4 flex flex-wrap gap-1.5 pb-2">
            {coachPromptLibrary.map(p => (
              <button key={p} type="button" onClick={() => form.setValue("prompt", p)}
                className="paper-chip rounded-full px-3 py-1.5 text-[10px] font-black">{p}</button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 px-4 pt-3 pb-4"
        style={{ borderTop: "1px solid rgba(245,236,216,0.07)", background: "rgba(10,11,8,0.94)", backdropFilter: "blur(16px)" }}>
        <form className="flex items-end gap-2"
          onSubmit={form.handleSubmit(async v => { await onSend(v.prompt); form.reset({ prompt: "" }); })}>
          <textarea className="paper-field min-h-[42px] flex-1 resize-none px-3 py-2.5 text-[14px] leading-5"
            placeholder="Ask your coach…" rows={1} {...form.register("prompt")} />
          <button type="submit" disabled={busy}
            className="paper-button-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[16px]">
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="phone-shell" style={{ background: "var(--background)" }}>
      <div className="phone-column" style={{ justifyContent: "center", alignItems: "center", gap: 16, padding: 24 }}>
        <div className="noise-layer" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[20px] border"
            style={{ borderColor: "rgba(132,181,109,0.24)", background: "rgba(26,28,18,0.96)" }}>
            <Image src="/varfoot-mark.svg" alt="" width={34} height={34} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[color:var(--green)]">VarFoot</p>
          <p className="text-[20px] font-black tracking-[-0.04em]">{message}</p>
          <div className="flex gap-1.5">
            <span className="bounce-dot h-2 w-2 rounded-full bg-[color:var(--green)]" />
            <span className="bounce-dot h-2 w-2 rounded-full bg-[color:var(--green)]" />
            <span className="bounce-dot h-2 w-2 rounded-full bg-[color:var(--green)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const localMode = !supabase;

  const [state, setState] = useState<AppState>(() => localMode ? loadState() : createBlankState());
  const [navTab, setNavTab] = useState<NavTab>("home");
  const [showProfile, setShowProfile] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(!localMode);
  const [bootstrapLoading, setBootstrapLoading] = useState(!localMode);
  const [demoMode, setDemoMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"local" | "loading" | "saving" | "synced" | "error" | "signed-out">(
    localMode ? "local" : "loading"
  );
  const saveTimerRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auth listener
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session); setAuthLoading(false);
      if (!data.session) { setBootstrapLoading(false); setSyncState("signed-out"); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, next) => {
      if (!active) return;
      setSession(next); setAuthLoading(false); setAuthError(null);
      if (!next) { setBootstrapLoading(false); setSyncState("signed-out"); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  // Bootstrap remote state
  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase, currentSession = session;
    let cancelled = false;
    void (async () => {
      setBootstrapLoading(true); setSyncState("loading");
      try {
        await upsertRemoteProfile(client, currentSession);
        const remote = await loadRemoteState(client, currentSession.user.id);
        if (cancelled) return;
        setState(remote ?? createBlankState()); setSyncState("synced");
      } catch (err) {
        if (cancelled) return;
        setAuthError(err instanceof Error ? err.message : "Unable to load cloud state.");
        setState(createBlankState()); setSyncState("error");
      } finally { if (!cancelled) setBootstrapLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [session, supabase]);

  // Auto-save
  useEffect(() => {
    if (localMode) { saveState(state); return; }
    if (!session || bootstrapLoading) return;
    const client = supabase!, currentSession = session;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try { setSyncState("saving"); await upsertRemoteState(client, currentSession, state); saveState(state); setSyncState("synced"); }
        catch { saveState(state); setSyncState("error"); }
      })();
    }, 600);
    return () => { if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current); };
  }, [bootstrapLoading, localMode, session, state, supabase]);

  // Scroll to top on tab change
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [navTab]);

  const scores = useMemo(() => getAssessmentScores(state.assessment), [state.assessment]);
  const nutritionTotals = useMemo(() => getNutritionTotals(state.nutrition.entries), [state.nutrition.entries]);
  const selectedWeek = state.plan.weeks.find(w => w.week === state.selectedWeek) ?? state.plan.weeks[0];

  function patchState(updater: (prev: AppState) => AppState) { setState(updater); }

  function updateAssessment(key: keyof AppState["assessment"], value: string) {
    const numeric = ["pushups", "plankSeconds", "wallSitSeconds", "passing", "shooting", "dribbling", "firstTouch", "speed"];
    patchState(prev => ({ ...prev, assessment: { ...prev.assessment, [key]: numeric.includes(key) ? Number(value) : value } }));
  }

  async function generatePlan(overrideState?: AppState) {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: overrideState ?? state }),
      });
      const payload = await res.json() as { generatedAt: string; weeks: AppState["plan"]["weeks"]; summary?: string };
      patchState(prev => ({ ...prev, onboardingComplete: true, selectedWeek: 1, plan: { generatedAt: payload.generatedAt, weeks: payload.weeks } }));
      if (payload.summary && !payload.summary.startsWith("Plan ready")) setPlanSummary(payload.summary);
      setNavTab("plan");
    } finally { setPlanLoading(false); }
  }

  async function handleOnboardComplete(data: OnboardData) {
    const assessment: AppState["assessment"] = {
      name: data.name, age: data.age, school: data.school, position: data.position,
      seasonGoal: data.seasonGoal, height: "", weight: "",
      pushups: Number(data.pushups), plankSeconds: Number(data.plankSeconds), wallSitSeconds: Number(data.wallSitSeconds),
      passing: Number(data.passing), shooting: Number(data.shooting), dribbling: Number(data.dribbling),
      firstTouch: Number(data.firstTouch), speed: Number(data.speed),
    };
    const newState: AppState = { ...state, assessment };
    patchState(() => newState);
    await generatePlan(newState);
  }

  async function sendCoach(prompt: string) {
    const trimmed = prompt.trim(); if (!trimmed) return;
    setCoachLoading(true);
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, text: trimmed, createdAt: new Date().toISOString() };
    patchState(prev => ({ ...prev, coach: { ...prev.coach, messages: [...prev.coach.messages, userMsg] } }));
    try {
      const res = await fetch("/api/coach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, state }),
      });
      const payload = await res.json() as { answer: string[]; timestamp: string };
      patchState(prev => ({
        ...prev, coach: {
          ...prev.coach, draft: "",
          messages: [...prev.coach.messages, { id: crypto.randomUUID(), role: "assistant" as const, text: payload.answer.join(" "), createdAt: payload.timestamp }],
        },
      }));
    } finally { setCoachLoading(false); }
  }

  function addMeal(meal: FoodEntry["meal"], foodName: string) {
    const match = foodCatalog.find(i => i.name === foodName) ?? foodCatalog[0];
    if (!match) return;
    patchState(prev => ({ ...prev, nutrition: { ...prev.nutrition, entries: [addFoodEntry(match.name, match.portion, meal), ...prev.nutrition.entries] } }));
  }

  function toggleDrill(name: string) {
    patchState(prev => {
      const saved = prev.library.savedDrills.includes(name);
      return { ...prev, library: { savedDrills: saved ? prev.library.savedDrills.filter(d => d !== name) : [name, ...prev.library.savedDrills] } };
    });
  }

  async function handleAuthSubmit(mode: AuthMode, email: string, password: string) {
    if (!supabase) return;
    setAuthError(null); setAuthLoading(true);
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) { setAuthError(result.error.message); setAuthLoading(false); return; }
    if (mode === "sign-up" && !result.data.session) {
      setAuthError("Account created! Check your email to confirm, then sign in."); setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    clearState(); setState(createBlankState()); setSession(null);
    setBootstrapLoading(false); setSyncState("signed-out"); setAuthLoading(false);
    setDemoMode(false); setPlanSummary(null);
  }

  function loadDemo() {
    setState(createDemoState()); setDemoMode(true); setShowProfile(false); setNavTab("home"); setPlanSummary(null);
  }

  function resetAll() {
    setState(createBlankState()); clearState(); setShowProfile(false); setDemoMode(false); setPlanSummary(null);
  }

  const tabTitles: Record<NavTab, string> = { home: "VarFoot", stats: "Stats", plan: "Plan", fuel: "Fuel", coach: "Coach" };

  // Gate: loading
  if (!localMode && !demoMode && (authLoading || bootstrapLoading)) return <LoadingScreen message="Loading your profile…" />;
  // Gate: auth
  if (!localMode && !demoMode && !session) return <AuthScreen loading={authLoading} error={authError} onSubmit={handleAuthSubmit} onDemo={loadDemo} />;
  // Gate: onboarding (new user — no name and not completed)
  if (!state.onboardingComplete) return <OnboardingWizard onComplete={handleOnboardComplete} onSkip={loadDemo} />;

  const isCoach = navTab === "coach";

  return (
    <div className="phone-shell" style={{ background: "var(--background)" }}>
      <div className="phone-column">
        <AppBar title={tabTitles[navTab]} playerName={state.assessment.name} syncState={syncState} onAvatarTap={() => setShowProfile(true)} />

        {authError && !showProfile && (
          <div className="flex items-start gap-3 px-4 py-3 text-[13px]"
            style={{ background: "rgba(215,121,109,0.08)", borderBottom: "1px solid rgba(215,121,109,0.14)", color: "var(--red)" }}>
            <span className="flex-1">{authError}</span>
            <button type="button" onClick={() => setAuthError(null)}><X size={16} /></button>
          </div>
        )}

        <div ref={contentRef} className={cn("content-area", isCoach ? "content-area-fixed" : "content-area-scroll")}>
          {navTab === "home" && <HomeTab state={state} scores={scores} nutritionTotals={nutritionTotals} onGoToStats={() => setNavTab("stats")} onGoToPlan={() => setNavTab("plan")} onGeneratePlan={() => generatePlan()} planLoading={planLoading} />}
          {navTab === "stats" && <StatsTab state={state} scores={scores} onAssessmentChange={updateAssessment} onGeneratePlan={() => generatePlan()} onToggleDrill={toggleDrill} planLoading={planLoading} />}
          {navTab === "plan" && <PlanTab state={state} selectedWeek={selectedWeek} onSelectWeek={w => patchState(prev => ({ ...prev, selectedWeek: w }))} onGeneratePlan={() => generatePlan()} planLoading={planLoading} planSummary={planSummary} />}
          {navTab === "fuel" && <FuelTab state={state} totals={nutritionTotals} onAddMeal={addMeal} />}
          {navTab === "coach" && <CoachTab state={state} onSend={sendCoach} busy={coachLoading} />}
        </div>

        <BottomNav active={navTab} onSelect={tab => { setNavTab(tab); }} />

        {showProfile && (
          <ProfileSheet state={state} localMode={localMode} syncState={syncState}
            onSignOut={handleSignOut} onLoadDemo={loadDemo} onReset={resetAll}
            onClose={() => setShowProfile(false)} />
        )}
      </div>
    </div>
  );
}

export default function Page() { return <App />; }
