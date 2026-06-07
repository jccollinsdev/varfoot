"use client";

import Image from "next/image";
import {
  House, ChartLineUp, ChatsCircle, Target, CaretLeft, X,
  ArrowRight, Check, Lock, Fire, Lightning, Plus,
  PaperPlaneTilt, Timer, BowlFood, Barbell,
} from "@phosphor-icons/react";
import {
  useEffect, useRef, useState, useMemo, useCallback,
  type ReactNode,
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Session } from "@supabase/supabase-js";
import {
  assessmentBenchmarks, drillLibrary, getAssessmentScores,
  getNutritionTotals, addFoodEntry, foodCatalog, loadState, saveState,
  clearState, createBlankState, createDemoState,
  type AppState, type FoodEntry, type MetricKey,
} from "@/lib/varfoot";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import { loadRemoteState, upsertRemoteState, upsertRemoteProfile } from "@/lib/varfoot-sync";
import { cn } from "@/lib/utils";

// ─── Navigation types ─────────────────────────────────────────────────────────
type RootTab = "home" | "plan" | "track" | "coach";
type TrackSeg = "technical" | "physical";
type Screen =
  | { id: "home" }
  | { id: "plan" }
  | { id: "track"; seg?: TrackSeg }
  | { id: "coach" }
  | { id: "benchmark" }
  | { id: "session" }
  | { id: "drill"; idx: number }
  | { id: "recap"; drillName: string; completedCount: number }
  | { id: "skill"; name: string }
  | { id: "nutrition" }
  | { id: "foodlog" }
  | { id: "fooddetail"; entryId: string };

const AUTH_TIMEOUT_MS = 6000;
const REMOTE_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

const SESSION_DRILLS = drillLibrary.slice(0, 3);

function getNextQueuedDrillIndex(completedDrillIndexes: number[]) {
  return SESSION_DRILLS.findIndex((_, idx) => !completedDrillIndexes.includes(idx));
}

function advancePlanSessions(weeks: AppState["plan"]["weeks"]) {
  let markedTodayDone = false;
  let promotedNext = false;

  return weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => {
      if (!markedTodayDone && session.status === "today") {
        markedTodayDone = true;
        return { ...session, status: "done" as const };
      }

      if (!promotedNext && session.status === "queued") {
        promotedNext = true;
        return { ...session, status: "today" as const };
      }

      return session;
    }),
  }));
}

// ─── Design atoms ─────────────────────────────────────────────────────────────

function Eyebrow({ children, tone = "muted", className = "" }: { children: ReactNode; tone?: "muted" | "green" | "gold" | "blue"; className?: string }) {
  const color = tone === "green" ? "var(--green)" : tone === "gold" ? "var(--yellow)" : tone === "blue" ? "var(--blue)" : "var(--text-3)";
  return <p className={cn("text-[10px] font-black uppercase tracking-[.14em]", className)} style={{ color }}>{children}</p>;
}

function Card({ children, className = "", style, onClick }: { children: ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <div className={cn("vf-card", className)} onClick={onClick} style={{ ...(onClick ? { cursor: "pointer" } : {}), ...style }}>{children}</div>;
}
function FlatCard({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={cn("vf-card-flat", className)} style={style}>{children}</div>;
}
function HiCard({ children, className = "", style, onClick }: { children: ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <div className={cn("vf-card-hi", className)} onClick={onClick} style={{ ...(onClick ? { cursor: "pointer" } : {}), ...style }}>{children}</div>;
}

function Btn({ children, onClick, disabled, className = "", ghost = false, sm = false }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; ghost?: boolean; sm?: boolean }) {
  const base = ghost ? "vf-btn-ghost" : "vf-btn";
  return <button type="button" className={cn(base, sm && "vf-btn-sm", className)} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Ring({ size, pct, sw = 7, children }: { size: number; pct: number; sw?: number; children?: ReactNode }) {
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, Math.max(0, pct));
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--elev)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--green)" strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      {children && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Radar({ you, tgt, axes, size = 160 }: { you: number[]; tgt: number[]; axes: string[]; size?: number }) {
  const cx = size / 2, cy = size / 2, maxR = size * 0.42;
  const n = axes.length;
  const angle = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2;
  const pt = (val: number, i: number) => {
    const a = angle(i), r = (val / 100) * maxR;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  };
  const polygon = (vals: number[]) => vals.map((v, i) => pt(v, i).join(",")).join(" ");
  const rings = [25, 50, 75, 100];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map(r => (
        <polygon key={r} points={axes.map((_, i) => pt(r, i).join(",")).join(" ")} fill="none" stroke="var(--elev)" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(100, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
      })}
      <polygon points={polygon(tgt)} fill="none" stroke="var(--text-3)" strokeWidth={1.5} strokeDasharray="3 3" />
      <polygon points={polygon(you)} fill="var(--green-ghost)" stroke="var(--green)" strokeWidth={2} />
      {axes.map((label, i) => {
        const [x, y] = pt(115, i);
        return <text key={i} x={x} y={y} fill="var(--text-3)" fontSize={8} fontWeight={800} textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-nunito)">{label}</text>;
      })}
    </svg>
  );
}

function BenchmarkBar({ metric, value }: { metric: MetricKey; value: number }) {
  const b = assessmentBenchmarks[metric];
  const { freshman, jv, varsity, higherIsBetter, label, unit } = b;
  const max = higherIsBetter ? varsity * 1.1 : freshman * 1.1;
  const min = higherIsBetter ? 0 : varsity * 0.8;
  const range = max - min;
  const pctOf = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100));
  const yourPct = pctOf(value);
  const vPct = pctOf(varsity);
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{label}</span>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, fontFamily: "var(--font-plex-mono)", color: "var(--green)", fontWeight: 700 }}>{value}{unit}</span>
          <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>/ {varsity}{unit}</span>
        </div>
      </div>
      <div className="vf-bar" style={{ position: "relative" }}>
        <div className="vf-bar-fill" style={{ width: `${yourPct}%` }} />
        <div style={{ position: "absolute", top: -1, bottom: -1, width: 2, left: `${vPct}%`, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
      </div>
      <div className="flex justify-between mt-1" style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 700 }}>
        <span>Freshman {freshman}{unit}</span>
        <span>JV {jv}{unit}</span>
        <span>Varsity {varsity}{unit}</span>
      </div>
    </div>
  );
}

// ─── Loading & Auth ────────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={{ background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", gap: 16 }}>
      <Image src="/varfoot-mark.svg" alt="VarFoot" width={48} height={48} />
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map(i => <div key={i} className="bounce-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />)}
      </div>
      <p style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 700 }}>{message}</p>
    </div>
  );
}

const authSchema = z.object({ email: z.string().email("Valid email required"), password: z.string().min(6, "Min 6 characters") });
type AuthForm = z.infer<typeof authSchema>;

function AuthScreen({ loading, error, onSubmit, onDemo }: {
  loading: boolean; error: string | null;
  onSubmit: (mode: "sign-in" | "sign-up", email: string, password: string) => Promise<void>;
  onDemo: () => void;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const { register, handleSubmit, formState: { errors } } = useForm<AuthForm>({ resolver: zodResolver(authSchema) });
  const submit = handleSubmit(d => void onSubmit(mode, d.email, d.password));
  return (
    <div style={{ background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", padding: "0 24px" }}>
      <Image src="/varfoot-mark.svg" alt="VarFoot" width={52} height={52} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-.04em", marginBottom: 4 }}>VarFoot</h1>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 28, fontWeight: 600 }}>Train with purpose. Make varsity.</p>
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
        {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,107,94,.1)", border: "1px solid rgba(255,107,94,.25)", color: "var(--red)", fontSize: 13, fontWeight: 600 }}>{error}</div>}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="vf-input" type="email" placeholder="Email" {...register("email")} autoComplete="email" />
          {errors.email && <p style={{ fontSize: 11, color: "var(--red)", marginTop: -6, fontWeight: 700 }}>{errors.email.message}</p>}
          <input className="vf-input" type="password" placeholder="Password" {...register("password")} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} />
          {errors.password && <p style={{ fontSize: 11, color: "var(--red)", marginTop: -6, fontWeight: 700 }}>{errors.password.message}</p>}
          <button type="submit" className="vf-btn" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Loading…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button type="button" onClick={() => setMode(m => m === "sign-in" ? "sign-up" : "sign-in")}
          style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>
          {mode === "sign-in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
        <div style={{ height: 1, background: "var(--border-soft)", margin: "4px 0" }} />
        <button type="button" className="vf-btn-ghost" onClick={onDemo}>Try demo</button>
      </div>
    </div>
  );
}

// ─── Onboarding Wizard ────────────────────────────────────────────────────────

const onboardSchema = z.object({
  name: z.string().min(1, "Required"),
  age: z.string(),
  school: z.string(),
  position: z.string(),
  seasonGoal: z.string(),
  pushups: z.string(),
  plankSeconds: z.string(),
  wallSitSeconds: z.string(),
  passing: z.string(),
  shooting: z.string(),
  dribbling: z.string(),
  firstTouch: z.string(),
  speed: z.string(),
});
type OnboardData = z.infer<typeof onboardSchema>;

function OnboardingWizard({ onComplete, onSkip }: { onComplete: (d: OnboardData) => Promise<void>; onSkip: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, getValues, trigger, formState: { errors } } = useForm<OnboardData>({
    resolver: zodResolver(onboardSchema),
    defaultValues: { pushups: "0", plankSeconds: "0", wallSitSeconds: "0", passing: "0", shooting: "0", dribbling: "0", firstTouch: "0", speed: "0" },
  });

  const next = async (fields: (keyof OnboardData)[]) => {
    const ok = await trigger(fields);
    if (ok) setStep(s => (s + 1) as 1 | 2 | 3 | 4);
  };

  const finish = handleSubmit(async d => {
    setSubmitting(true);
    try { await onComplete(d); } finally { setSubmitting(false); }
  });

  const stepLabels = ["Profile", "Physical", "Technical", "Done"];

  return (
    <div style={{ background: "var(--bg)", display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Image src="/varfoot-mark.svg" alt="" width={28} height={28} />
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-.02em" }}>VarFoot Setup</span>
          <button type="button" onClick={onSkip} style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-3)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Skip</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {stepLabels.map((l, i) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ height: 3, borderRadius: 999, background: i < step ? "var(--green)" : "var(--elev)", transition: "background 300ms" }} />
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 4, color: i < step ? "var(--green)" : "var(--text-3)" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="content-area content-scroll" style={{ flex: 1, padding: "0 20px" }}>
        {step === 1 && (
          <div className="slide-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-.04em", marginBottom: 4 }}>Tell us about you</h2>
            {(["name", "school", "position"] as const).map(k => (
              <label key={k} style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--text-2)" }}>
                {k === "name" ? "Your name" : k === "school" ? "School / team" : "Position"}
                <input className="vf-input" type="text" placeholder={k === "name" ? "Sansar Karki" : k === "school" ? "Lincoln High" : "Midfielder"} {...register(k)} />
                {errors[k] && <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700 }}>{errors[k]?.message}</span>}
              </label>
            ))}
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--text-2)" }}>
              Age
              <input className="vf-input" type="number" inputMode="numeric" placeholder="16" {...register("age")} />
              {errors.age && <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700 }}>{errors.age?.message}</span>}
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--text-2)" }}>
              Season goal
              <input className="vf-input" type="text" placeholder="Make varsity this spring" {...register("seasonGoal")} />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="slide-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-.04em", marginBottom: 4 }}>Physical tests</h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, marginBottom: 4 }}>Enter your best numbers. Be honest — it helps calibrate your plan.</p>
            {(["pushups", "plankSeconds", "wallSitSeconds"] as const).map(k => {
              const b = assessmentBenchmarks[k];
              return (
                <label key={k} style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--text-2)" }}>
                  {b.label} ({b.unit})
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input className="vf-input" type="number" inputMode="numeric" placeholder="0" {...register(k)} style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, flexShrink: 0 }}>Varsity: {b.varsity}</span>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="slide-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-.04em", marginBottom: 4 }}>Technical tests</h2>
            {(["passing", "shooting", "dribbling", "firstTouch", "speed"] as const).map(k => {
              const b = assessmentBenchmarks[k];
              return (
                <label key={k} style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--text-2)" }}>
                  {b.label} ({b.unit})
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input className="vf-input" type="number" inputMode="decimal" placeholder="0" {...register(k)} style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, flexShrink: 0 }}>Varsity: {b.varsity}</span>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {step === 4 && (
          <div className="slide-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 32, gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--green-ghost)", border: "2px solid var(--green-line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={36} weight="bold" color="var(--green)" />
            </div>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-.04em" }}>You&apos;re set, {getValues("name").split(" ")[0] || "athlete"}.</h2>
              <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, marginTop: 8 }}>We&apos;ll build your 6-week varsity roadmap from your results.</p>
            </div>
          </div>
        )}
        <div style={{ height: 120 }} />
      </div>

      <div className="vf-footer" style={{ position: "static", padding: "12px 20px 28px" }}>
        {step < 4 ? (
          <button type="button" className="vf-btn" onClick={() => {
            if (step === 1) void next(["name"]);
            else if (step === 2) void next(["pushups", "plankSeconds", "wallSitSeconds"]);
            else void next(["passing", "shooting", "dribbling", "firstTouch", "speed"]);
          }}>
            Continue
          </button>
        ) : (
          <button type="button" className="vf-btn" disabled={submitting} onClick={() => void finish()}>
            {submitting ? "Building plan…" : "Generate my plan ⚡"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Navigation components ────────────────────────────────────────────────────

const NAV_TABS: Array<{ id: RootTab; label: string; Icon: React.ComponentType<{ size: number; weight: string; color: string }> }> = [
  { id: "home",  label: "Home",  Icon: House as never },
  { id: "plan",  label: "Plan",  Icon: Target as never },
  { id: "track", label: "Track", Icon: ChartLineUp as never },
  { id: "coach", label: "Coach", Icon: ChatsCircle as never },
];

function BottomNav({ active, onSelect }: { active: RootTab; onSelect: (t: RootTab) => void }) {
  return (
    <div className="bottom-nav">
      {NAV_TABS.map(({ id, label, Icon }) => {
        const on = id === active;
        return (
          <button key={id} type="button" className="nav-item" onClick={() => onSelect(id)}>
            <Icon size={22} weight={on ? "fill" : "regular"} color={on ? "var(--green)" : "var(--text-3)"} />
            <span className="nav-label" style={{ color: on ? "var(--green)" : "var(--text-3)" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function BackBar({ title, sub, onBack, action }: { title: string; sub?: string; onBack: () => void; action?: ReactNode }) {
  return (
    <div className="app-bar">
      <button type="button" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--green)", fontWeight: 800, fontSize: 14 }}>
        <CaretLeft size={20} weight="bold" color="var(--green)" /> Back
      </button>
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-.02em", color: "var(--text)", whiteSpace: "nowrap" }}>{title}</p>
        {sub && <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>{sub}</p>}
      </div>
      <div>{action}</div>
    </div>
  );
}

function TopBar({ title, streak, onAvatarTap }: { title: string; streak: number; onAvatarTap: () => void }) {
  return (
    <div className="app-bar">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)" }}>
          <Image src="/varfoot-mark.svg" alt="" width={20} height={20} />
        </div>
        <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-.03em" }}>{title}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border-soft)" }}>
            <Fire size={13} weight="fill" color="var(--yellow)" />
            <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text)" }}>{streak}</span>
          </div>
        )}
        <button type="button" onClick={onAvatarTap} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--elev)", color: "var(--text-2)", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
          SK
        </button>
      </div>
    </div>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({ state, scores, nutritionTotals, go, goTab, onGeneratePlan, planLoading }: {
  state: AppState;
  scores: ReturnType<typeof getAssessmentScores>;
  nutritionTotals: ReturnType<typeof getNutritionTotals>;
  go: (s: Screen) => void;
  goTab: (t: RootTab) => void;
  onGeneratePlan: () => Promise<void>;
  planLoading: boolean;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (state.assessment.name || "Athlete").split(" ")[0];
  const today = state.plan.weeks
    .flatMap(w => w.sessions)
    .find(s => s.status === "today") ?? state.plan.weeks[0]?.sessions[0];
  const calPct = Math.min(1, nutritionTotals.calories / (state.nutrition.calorieTarget || 2000));
  const techScore = Math.round(scores.technicalScore);
  const physScore = Math.round(scores.physicalScore);
  const nutriScore = Math.round(calPct * 100);

  return (
    <div className="tab-enter" style={{ padding: "8px 16px 80px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".2em", color: "var(--text-3)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.05em", marginTop: 2 }}>{greeting}, {firstName}.</h1>
      </div>

      {today && (
        <HiCard onClick={() => go({ id: "session" })}>
          <Eyebrow tone="green">Today&apos;s session · ~{today.duration}</Eyebrow>
          <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-.04em", marginTop: 6 }}>{today.title}</h2>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, marginTop: 4 }}>{today.drill}</p>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="vf-chip" style={{ fontSize: 11 }}>3 drills</span>
              <span className="vf-chip" style={{ fontSize: 11 }}>{today.focus}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--green)", fontWeight: 900, fontSize: 13 }}>
              Start <ArrowRight size={14} weight="bold" />
            </div>
          </div>
        </HiCard>
      )}

      <div>
        <Eyebrow>Your level</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          {[
            { label: "Technical", score: techScore, color: "var(--green)", action: () => goTab("track") },
            { label: "Physical",  score: physScore, color: "var(--blue)",  action: () => go({ id: "track", seg: "physical" }) },
            { label: "Nutrition", score: nutriScore, color: "var(--yellow)", action: () => go({ id: "nutrition" }) },
          ].map(({ label, score, color, action }) => (
            <Card key={label} onClick={action} className="transition active:scale-[0.97]">
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, marginBottom: 8 }} />
              <p style={{ fontSize: 11, fontWeight: 800, color: "var(--text-2)", marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-.05em", lineHeight: 1, fontFamily: "var(--font-plex-mono)", color: "var(--text)" }}>{score}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card onClick={() => goTab("coach")} className="transition active:scale-[0.98]">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="vf-ico">
            <ChatsCircle size={20} weight="fill" color="var(--green)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>Coach&apos;s note</Eyebrow>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {state.coach.messages.find(m => m.role === "assistant")?.text ?? "Tap to open your AI coach."}
            </p>
          </div>
          <ArrowRight size={16} color="var(--text-3)" weight="bold" />
        </div>
      </Card>

      <Card onClick={() => go({ id: "benchmark" })} className="transition active:scale-[0.98]">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="vf-ico">
            <Target size={20} weight="fill" color="var(--green)" />
          </div>
          <div style={{ flex: 1 }}>
            <Eyebrow tone="green">You vs varsity</Eyebrow>
            <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginTop: 3 }}>See your full gap analysis</p>
          </div>
          <ArrowRight size={16} color="var(--text-3)" weight="bold" />
        </div>
      </Card>

      {!state.plan.weeks.length && (
        <Btn onClick={() => void onGeneratePlan()} disabled={planLoading}>
          {planLoading ? "Building plan…" : "Generate my plan ⚡"}
        </Btn>
      )}
    </div>
  );
}

// ─── Plan Screen ──────────────────────────────────────────────────────────────

function PlanScreen({ state, onSelectWeek, go, onGeneratePlan, planLoading, planSummary }: {
  state: AppState; onSelectWeek: (w: number) => void;
  go: (s: Screen) => void; onGeneratePlan: () => Promise<void>;
  planLoading: boolean; planSummary: string | null;
}) {
  const selectedWeek = state.plan.weeks.find(w => w.week === state.selectedWeek) ?? state.plan.weeks[0];

  if (!state.plan.weeks.length) {
    return (
      <div className="tab-enter" style={{ padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-.04em" }}>Training Plan</h2>
        <Card>
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <Target size={48} weight="light" color="var(--text-3)" style={{ margin: "0 auto" }} />
            <p style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-.04em", marginTop: 12 }}>No plan yet</p>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, marginTop: 8, lineHeight: 1.5 }}>
              Complete the assessment to generate your personalized 6-week varsity roadmap.
            </p>
            <button type="button" className="vf-btn" onClick={() => void onGeneratePlan()} disabled={planLoading} style={{ marginTop: 20 }}>
              {planLoading ? "Generating…" : "Generate plan ⚡"}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="tab-enter" style={{ padding: "8px 16px 80px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-.04em" }}>Training Plan</h2>
        <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>6 weeks</span>
      </div>

      {planSummary && (
        <FlatCard>
          <Eyebrow tone="green">AI Coach</Eyebrow>
          <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, marginTop: 6, lineHeight: 1.5 }}>{planSummary}</p>
        </FlatCard>
      )}

      <div style={{ display: "flex", gap: 8, overflowX: "auto" }} className="scrollbar-none">
        {state.plan.weeks.map(w => (
          <button key={w.week} type="button" className={cn("vf-chip", w.week === state.selectedWeek && "on")} onClick={() => onSelectWeek(w.week)}>
            Wk {w.week}
          </button>
        ))}
      </div>

      {selectedWeek && (
        <>
          <HiCard>
            <Eyebrow tone="green">Week {selectedWeek.week} of {state.plan.weeks.length}</Eyebrow>
            <h3 style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-.03em", marginTop: 4 }}>{selectedWeek.label}</h3>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, marginTop: 4 }}>{selectedWeek.emphasis}</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, marginTop: 6, fontStyle: "italic" }}>{selectedWeek.readinessNote}</p>
          </HiCard>

          <div style={{ position: "relative", paddingLeft: 26 }}>
            <div style={{ position: "absolute", left: 25, top: 0, bottom: 0, width: 2, background: "repeating-linear-gradient(180deg, var(--border) 0 4px, transparent 4px 9px)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {selectedWeek.sessions.map((session, idx) => {
                const isDone = session.status === "done";
                const isToday = session.status === "today";
                const isLocked = session.status === "queued";
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 14, opacity: isLocked ? 0.45 : 1 }}>
                    <div className={cn("vf-node-dot", isDone && "done", isToday && "now", isLocked && "lock")}
                      style={{ cursor: isLocked ? "default" : "pointer" }}
                      onClick={() => !isLocked && go({ id: "session" })}>
                      {isDone ? <Check size={20} weight="bold" /> : isLocked ? <Lock size={18} weight="bold" /> : <Lightning size={20} weight="fill" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, cursor: isLocked ? "default" : "pointer" }} onClick={() => !isLocked && go({ id: "session" })}>
                      <p style={{ fontSize: 14, fontWeight: 900, color: isToday ? "var(--green)" : "var(--text)" }}>{session.title}</p>
                      <p style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>{session.day} · {session.duration}</p>
                    </div>
                    {isToday && <span className="vf-chip on" style={{ fontSize: 10 }}>TODAY</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Track / Dashboard Screen ─────────────────────────────────────────────────

function TrackScreen({ state, scores, go }: {
  state: AppState; scores: ReturnType<typeof getAssessmentScores>;
  go: (s: Screen) => void;
}) {
  const [seg, setSeg] = useState<TrackSeg>("technical");
  const TECH: MetricKey[] = ["passing", "shooting", "dribbling", "firstTouch", "speed"];
  const PHYS: MetricKey[] = ["pushups", "plankSeconds", "wallSitSeconds"];

  const radarYou = TECH.map(m => {
    const b = assessmentBenchmarks[m];
    const v = state.assessment[m] as number;
    if (b.higherIsBetter) return Math.min(100, (v / b.varsity) * 100);
    return Math.min(100, (b.freshman / v) * 100);
  });
  const radarTgt = [100, 100, 100, 100, 100];
  const axes = ["PAS", "SHO", "DRI", "TOU", "SPD"];

  return (
    <div className="tab-enter" style={{ padding: "8px 16px 80px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-.04em" }}>Progress</h2>
        <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>Last 8 weeks</span>
      </div>

      <div className="vf-seg">
        {(["technical", "physical"] as const).map(s => (
          <button key={s} type="button" className={cn("vf-seg-btn", seg === s && "on")} onClick={() => setSeg(s)}>
            {s === "technical" ? "Technical" : "Physical"}
          </button>
        ))}
        <button type="button" className="vf-seg-btn" onClick={() => go({ id: "nutrition" })}>Nutrition</button>
      </div>

      {seg === "technical" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                <p className="vf-stat-n big" style={{ fontFamily: "var(--font-plex-mono)", color: "var(--green)" }}>{Math.round(scores.technicalScore)}</p>
                <p className="vf-stat-l">Technical</p>
                <p className="vf-delta" style={{ marginTop: 4 }}>+{Math.max(0, Math.round(scores.technicalScore - 57))} this season</p>
              </div>
              <div style={{ flex: 1, textAlign: "right" }}>
                <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>Varsity target</p>
                <p style={{ fontSize: 22, fontWeight: 900, fontFamily: "var(--font-plex-mono)", color: "var(--text)" }}>80</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginTop: 2 }}>{Math.max(0, 80 - Math.round(scores.technicalScore))} to go</p>
              </div>
            </div>
            <div className="vf-bar" style={{ marginTop: 12 }}>
              <div className="vf-bar-fill" style={{ width: `${Math.round(scores.technicalScore)}%` }} />
            </div>
          </Card>

          <Card>
            <Eyebrow>Skill shape · you vs varsity</Eyebrow>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
              <Radar you={radarYou} tgt={radarTgt} axes={axes} size={160} />
            </div>
            <button type="button" onClick={() => go({ id: "benchmark" })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 10, fontSize: 12, fontWeight: 800, color: "var(--green)", background: "none", border: "none", cursor: "pointer" }}>
              Full benchmark <ArrowRight size={13} weight="bold" />
            </button>
          </Card>

          <div>
            <Eyebrow>Skills breakdown</Eyebrow>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 1 }}>
              {TECH.map(m => {
                const b = assessmentBenchmarks[m];
                const v = state.assessment[m] as number;
                const pct = b.higherIsBetter ? Math.min(100, (v / b.varsity) * 100) : Math.min(100, (b.freshman / Math.max(v, 0.1)) * 100);
                const gap = b.higherIsBetter ? b.varsity - v : v - b.varsity;
                const gapStr = gap > 0 ? `+${gap.toFixed(1)} to close` : "Varsity ✓";
                return (
                  <button key={m} type="button" onClick={() => go({ id: "skill", name: b.label })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "1px solid var(--border-soft)", background: "none", cursor: "pointer", textAlign: "left", width: "100%" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{b.label}</span>
                        <span style={{ fontSize: 12, fontFamily: "var(--font-plex-mono)", fontWeight: 700, color: "var(--text)" }}>{v}{b.unit}</span>
                      </div>
                      <div className="vf-bar thin"><div className="vf-bar-fill" style={{ width: `${pct}%` }} /></div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 10, color: gap > 0 ? "var(--red)" : "var(--green)", fontWeight: 800 }}>{gapStr}</p>
                    </div>
                    <ArrowRight size={14} color="var(--text-3)" weight="bold" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Eyebrow>Personal bests</Eyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
              {[
                { val: `${state.assessment.speed}s`, label: "20-yd sprint", Icon: Lightning },
                { val: `${state.assessment.pushups}`, label: "Pushups", Icon: Barbell },
                { val: `${state.assessment.plankSeconds}s`, label: "Plank", Icon: Timer },
              ].map(({ val, label, Icon }) => (
                <FlatCard key={label} className="text-center" style={{ textAlign: "center" }}>
                  <Icon size={18} weight="bold" color="var(--green)" style={{ margin: "0 auto 6px" }} />
                  <p style={{ fontSize: 18, fontWeight: 900, fontFamily: "var(--font-plex-mono)", lineHeight: 1 }}>{val}</p>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-3)", marginTop: 4 }}>{label}</p>
                </FlatCard>
              ))}
            </div>
          </div>
        </div>
      )}

      {seg === "physical" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                <p className="vf-stat-n big" style={{ fontFamily: "var(--font-plex-mono)", color: "var(--blue)" }}>{Math.round(scores.physicalScore)}</p>
                <p className="vf-stat-l">Physical</p>
              </div>
              <div style={{ flex: 1 }}>
                <div className="vf-bar"><div className="vf-bar-fill" style={{ width: `${Math.round(scores.physicalScore)}%`, background: "var(--blue)" }} /></div>
              </div>
            </div>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PHYS.map(m => {
              const b = assessmentBenchmarks[m];
              const v = state.assessment[m] as number;
              const pct = b.higherIsBetter ? Math.min(100, (v / b.varsity) * 100) : Math.min(100, (b.freshman / Math.max(v, 0.1)) * 100);
              return (
                <Card key={m}>
                  <Eyebrow>{b.label}</Eyebrow>
                  <p style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-.04em", fontFamily: "var(--font-plex-mono)", marginTop: 4 }}>{v}<span style={{ fontSize: 12, color: "var(--text-3)" }}>{b.unit}</span></p>
                  <div className="vf-bar thin" style={{ marginTop: 8 }}><div className="vf-bar-fill" style={{ width: `${pct}%`, background: "var(--blue)" }} /></div>
                  <p style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, marginTop: 4 }}>Varsity: {b.varsity}{b.unit}</p>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Coach Screen ─────────────────────────────────────────────────────────────

function CoachScreen({ state, onSend, busy }: { state: AppState; onSend: (p: string) => Promise<void>; busy: boolean }) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const QUICK = ["What should I work on today?", "I got tired after 20 minutes, what should I change?", "How do I improve my shooting this week?"];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.coach.messages]);

  const send = (text: string) => { if (text.trim()) { void onSend(text); setDraft(""); } };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }} className="scrollbar-none">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0 12px" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--green-ghost)", border: "1px solid var(--green-line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Image src="/varfoot-mark.svg" alt="" width={18} height={18} />
          </div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 900 }}>Coach</span>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--green)", marginLeft: 8 }}>● Always on</span>
          </div>
        </div>

        {state.coach.messages.length === 0 && (
          <div className="vf-bubble-in">Hey! I&apos;m your VarFoot coach. Ask me anything about your training, gaps, or plan.</div>
        )}
        {state.coach.messages.map(m => (
          <div key={m.id} className={m.role === "assistant" ? "vf-bubble-in" : "vf-bubble-out"}>{m.text}</div>
        ))}
        {busy && (
          <div className="vf-bubble-in" style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {[0, 1, 2].map(i => <div key={i} className="bounce-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-3)" }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, padding: "4px 16px 8px", overflowX: "auto" }} className="scrollbar-none">
        {QUICK.map(q => (
          <button key={q} type="button" className="vf-chip" onClick={() => send(q)} style={{ fontSize: 11 }}>{q}</button>
        ))}
      </div>

      <div style={{ padding: "8px 16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", borderTop: "1px solid var(--border-soft)", display: "flex", gap: 10, alignItems: "center", background: "var(--bg)" }}>
        <input
          className="vf-input-sm"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send(draft)}
          placeholder="Ask your coach…"
          style={{ flex: 1, height: 42, borderRadius: 999 }}
        />
        <button type="button" onClick={() => send(draft)} disabled={!draft.trim() || busy}
          style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--green)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: !draft.trim() || busy ? 0.5 : 1 }}>
          <PaperPlaneTilt size={18} weight="fill" color="var(--green-ink)" />
        </button>
      </div>
    </div>
  );
}

// ─── Benchmark Screen (push) ──────────────────────────────────────────────────

function BenchmarkScreen({ state, goTab }: {
  state: AppState; scores?: ReturnType<typeof getAssessmentScores>;
  onBack?: () => void; go?: (s: Screen) => void; goTab: (t: RootTab) => void;
}) {
  const ALL: MetricKey[] = ["passing", "shooting", "dribbling", "firstTouch", "speed", "pushups", "plankSeconds", "wallSitSeconds"];
  return (
    <div className="slide-in" style={{ padding: "8px 16px 80px", display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-.04em", color: "var(--text-2)" }}>You&apos;re closer than you think.</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ALL.map(m => <BenchmarkBar key={m} metric={m} value={state.assessment[m] as number} />)}
      </div>
      <button type="button" className="vf-btn" onClick={() => goTab("plan")}>
        <Lightning size={16} weight="fill" /> Generate my plan ⚡
      </button>
    </div>
  );
}

// ─── Session Detail Screen (push) ─────────────────────────────────────────────

function SessionScreen({ state, go }: { state: AppState; onBack?: () => void; go: (s: Screen) => void }) {
  const today = state.plan.weeks.flatMap(w => w.sessions).find(s => s.status === "today") ?? state.plan.weeks[0]?.sessions[0];
  const { completedDrillIndexes, currentDrillIndex } = state.ui.sessionProgress;
  const completedCount = completedDrillIndexes.length;
  const progressPct = Math.max(0, Math.min(100, (completedCount / SESSION_DRILLS.length) * 100));
  const resumeIndex = getNextQueuedDrillIndex(completedDrillIndexes);

  return (
    <div className="slide-in" style={{ padding: "8px 16px 100px", display: "flex", flexDirection: "column", gap: 14 }}>
      <HiCard>
        <Eyebrow tone="green">Focus</Eyebrow>
        <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-.03em", marginTop: 4 }}>{today?.title ?? "Dribbling + Finishing"}</h2>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <span className="vf-chip">3 drills</span>
          <span className="vf-chip">~35 min</span>
        </div>
        <div className="vf-bar" style={{ marginTop: 10 }}><div className="vf-bar-fill" style={{ width: `${progressPct}%` }} /></div>
        <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, marginTop: 4 }}>{completedCount} of 3 complete</p>
      </HiCard>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SESSION_DRILLS.map((drill, idx) => {
          const isDone = completedDrillIndexes.includes(idx);
          const isNow = !isDone && idx === currentDrillIndex;
          return (
            <div key={drill.name} className={isNow ? "vf-card-hi" : "vf-card"} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
              onClick={() => go({ id: "drill", idx })}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: isDone ? "var(--green-dim)" : isNow ? "var(--green-ghost)" : "var(--elev)", border: `2px solid ${isDone ? "var(--green-dim)" : isNow ? "var(--green)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                {isDone ? <Check size={14} weight="bold" color="var(--green)" /> : <span style={{ color: isNow ? "var(--green)" : "var(--text-3)" }}>{idx + 1}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 900, color: "var(--text)" }}>{drill.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>{drill.focus} · 3 sets</p>
              </div>
              {isDone && <span className="vf-chip" style={{ fontSize: 10 }}>Done</span>}
              {isNow && <span className="vf-chip on" style={{ fontSize: 10 }}>Start</span>}
            </div>
          );
        })}
      </div>

      <FlatCard>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <ChatsCircle size={18} weight="fill" color="var(--text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, fontStyle: "italic", lineHeight: 1.4 }}>
            Quality over speed today. Plant your standing foot and follow through low.
          </p>
        </div>
      </FlatCard>

      <div className="vf-footer" style={{ position: "static" }}>
        <button type="button" className="vf-btn" onClick={() => go({ id: "drill", idx: resumeIndex === -1 ? SESSION_DRILLS.length - 1 : resumeIndex })}>
          {completedCount === 0 ? "Start session" : "Resume session"} <ArrowRight size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}

// ─── Active Drill Screen (push) ────────────────────────────────────────────────

function DrillScreen({
  idx,
  state,
  onCompleteDrill,
  onSkipDrill,
}: {
  idx: number;
  state: AppState;
  onBack?: () => void;
  onCompleteDrill: (drillIndex: number) => void;
  onSkipDrill: () => void;
  go?: (s: Screen) => void;
}) {
  const [set, setSet] = useState(1);
  const [goals, setGoals] = useState(7);
  const drill = SESSION_DRILLS[idx] ?? SESSION_DRILLS[0];
  const totalSets = 3;
  const completedDrillIndexes = state.ui.sessionProgress.completedDrillIndexes;
  const imgSrc = drill.diagram;
  const isLastPendingDrill = completedDrillIndexes.length >= SESSION_DRILLS.length - 1 && !completedDrillIndexes.includes(idx);

  const logSet = () => {
    if (set < totalSets) { setSet(s => s + 1); setGoals(7); }
    else onCompleteDrill(idx);
  };

  return (
    <div className="slide-in" style={{ padding: "8px 16px 100px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {Array.from({ length: totalSets }, (_, i) => (
          <div key={i} className={cn("vf-pip", i < set - 1 && "done", i === set - 1 && "active")} style={{ width: 12, height: 12 }} />
        ))}
      </div>

      <div>
        <Eyebrow tone="green">{drill.focus}</Eyebrow>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.05em", marginTop: 4 }}>{drill.name}</h1>
      </div>

      <div className="vf-block" style={{ height: 200, width: "100%" }}>
        <Image src={imgSrc} alt={`${drill.name} diagram`} fill style={{ objectFit: "contain", padding: 8 }} />
      </div>

      <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, lineHeight: 1.5 }}>{drill.instructions}</p>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 900 }}>Set {set} of {totalSets}</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 700 }}>Target: {drill.target}</p>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600, marginBottom: 10 }}>Goals / clean reps this set:</p>
        <div className="vf-stepper">
          <button type="button" className="vf-stepper-btn" onClick={() => setGoals(g => Math.max(0, g - 1))}>−</button>
          <div className="vf-stepper-val">
            <span style={{ fontSize: 30, fontWeight: 900, fontFamily: "var(--font-plex-mono)" }}>{goals}</span>
          </div>
          <button type="button" className="vf-stepper-btn" onClick={() => setGoals(g => Math.min(10, g + 1))}>+</button>
        </div>
      </Card>

      <div className="vf-footer" style={{ position: "static", gap: 10 }}>
        <button type="button" className="vf-btn-ghost vf-btn-sm" style={{ flex: "none" }} onClick={onSkipDrill}>Skip</button>
        <button type="button" className="vf-btn" style={{ flex: 1 }} onClick={logSet}>
          {set < totalSets ? `Log set ${set}` : isLastPendingDrill ? "Finish session" : "Finish drill"}
        </button>
      </div>
    </div>
  );
}

// ─── Session Recap Screen (push) ──────────────────────────────────────────────

function RecapScreen({
  drillName,
  completedCount,
  state,
  onContinue,
  goTab,
}: {
  drillName: string;
  completedCount: number;
  state: AppState;
  onBack?: () => void;
  onContinue: () => void;
  goTab: (t: RootTab) => void;
}) {
  const firstName = (state.assessment.name || "Athlete").split(" ")[0];
  const completedAll = completedCount >= SESSION_DRILLS.length;
  return (
    <div className="slide-in" style={{ padding: "24px 16px 80px", display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--green-ghost)", border: "2px solid var(--green-line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Check size={32} weight="bold" color="var(--green)" />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".1em" }}>{completedAll ? "Session complete" : "Drill logged"}</p>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-.05em", marginTop: 4 }}>Nice work, {firstName}.</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 600, marginTop: 4 }}>
          {completedAll ? `You finished ${drillName} and wrapped all 3 drills.` : `You finished ${drillName}. ${SESSION_DRILLS.length - completedCount} drill${SESSION_DRILLS.length - completedCount === 1 ? "" : "s"} left in this session.`}
        </p>
      </div>

      <div style={{ width: "100%", display: "flex", gap: 10 }}>
        {[
          { label: "Shooting", delta: "+2" },
          { label: "Dribbling", delta: "+1" },
          { label: "Streak 🔥", delta: "+1" },
        ].map(({ label, delta }) => (
          <FlatCard key={label} style={{ flex: 1, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "var(--green)", fontWeight: 900 }}>{delta}</p>
            <p style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 700, marginTop: 2 }}>{label}</p>
          </FlatCard>
        ))}
      </div>

      <FlatCard style={{ width: "100%", textAlign: "left" }}>
        <Eyebrow tone="green">Best set</Eyebrow>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginTop: 6, lineHeight: 1.4 }}>Best {drillName} set yet. That&apos;s varsity-level on your strong foot.</p>
      </FlatCard>

      <FlatCard style={{ width: "100%", textAlign: "left" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <ChatsCircle size={16} weight="fill" color="var(--text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, fontStyle: "italic", lineHeight: 1.4 }}>
            {completedAll ? "Tomorrow we hit the weak foot. That's your ticket to varsity." : "Keep the same tempo on the next drill so the session stays sharp from start to finish."}
          </p>
        </div>
      </FlatCard>

      <button type="button" className="vf-btn" style={{ width: "100%" }} onClick={() => (completedAll ? goTab("home") : onContinue())}>{completedAll ? "Done" : "Back to session"}</button>
    </div>
  );
}

// ─── Skill Detail Screen (push) ───────────────────────────────────────────────

function SkillScreen({ name, state, goTab }: { name: string; state: AppState; onBack?: () => void; goTab: (t: RootTab) => void }) {
  const entry = Object.entries(assessmentBenchmarks).find(([, b]) => b.label === name);
  const [metric, bm] = entry ?? Object.entries(assessmentBenchmarks)[0];
  const value = state.assessment[metric as MetricKey] as number;
  const pct = bm.higherIsBetter ? Math.min(100, (value / bm.varsity) * 100) : Math.min(100, (bm.freshman / Math.max(value, 0.1)) * 100);
  const gap = bm.higherIsBetter ? bm.varsity - value : value - bm.varsity;

  return (
    <div className="slide-in" style={{ padding: "8px 16px 80px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p className="vf-stat-n big" style={{ fontFamily: "var(--font-plex-mono)" }}>{value}<span style={{ fontSize: 14, color: "var(--text-3)" }}>{bm.unit}</span></p>
            <p className="vf-stat-l">{bm.label}</p>
            <p className="vf-delta" style={{ marginTop: 4 }}>+3 this month</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>Varsity target</p>
            <p style={{ fontSize: 22, fontWeight: 900, fontFamily: "var(--font-plex-mono)" }}>{bm.varsity}{bm.unit}</p>
            {gap > 0 && <p style={{ fontSize: 11, color: "var(--red)", fontWeight: 800 }}>{gap.toFixed(1)} to close</p>}
          </div>
        </div>
        <div className="vf-bar" style={{ marginTop: 10 }}><div className="vf-bar-fill" style={{ width: `${pct}%` }} /></div>
      </Card>

      <Card>
        <Eyebrow>How it&apos;s measured</Eyebrow>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="vf-ico neutral"><Target size={16} weight="bold" color="var(--text-3)" /></div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800 }}>{bm.label}</p>
              <p style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>Your score: {value}{bm.unit}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <Eyebrow>Recent results</Eyebrow>
        {[["Mon Jun 8", "Best result"], ["Thu Jun 4", "Good effort"], ["Mon Jun 1", "Starting point"]].map(([date, result]) => (
          <div key={date} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-soft)" }}>
            <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>{date}</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{result}</span>
          </div>
        ))}
      </Card>

      <HiCard>
        <Eyebrow tone="green">Close the gap</Eyebrow>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>2 {name} drills added to this week&apos;s plan.</p>
        <button type="button" className="vf-btn" style={{ marginTop: 10 }} onClick={() => goTab("plan")}>Go to plan</button>
      </HiCard>
    </div>
  );
}

// ─── Nutrition Screen (push) ──────────────────────────────────────────────────

function NutritionScreen({ state, totals, go }: {
  state: AppState; totals: ReturnType<typeof getNutritionTotals>;
  go: (s: Screen) => void; onAddMeal?: (meal: FoodEntry["meal"], food: string) => void;
}) {
  const goal = state.nutrition.calorieTarget || 2000;
  const pct = Math.min(1, totals.calories / goal);
  const macros = [
    { name: "Protein", g: totals.protein, target: state.nutrition.proteinTarget || 120, color: "var(--green)" },
    { name: "Carbs",   g: totals.carbs,   target: state.nutrition.carbTarget   || 200, color: "var(--yellow)" },
    { name: "Fat",     g: totals.fat,     target: state.nutrition.fatTarget    || 60,  color: "var(--blue)" },
  ];

  return (
    <div className="slide-in" style={{ padding: "8px 16px 80px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Ring size={100} pct={pct} sw={9}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-plex-mono)", lineHeight: 1 }}>{totals.calories}</p>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3)" }}>kcal</p>
            </div>
          </Ring>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {macros.map(({ name, g, target, color }) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-2)" }}>{name}</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-plex-mono)", fontWeight: 700, color }}>{g}g</span>
                </div>
                <div className="vf-bar thin"><div className="vf-bar-fill" style={{ width: `${Math.min(100, (g / target) * 100)}%`, background: color }} /></div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div>
        <Eyebrow>Today&apos;s log</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 8 }}>
          {state.nutrition.entries.map(entry => (
            <button key={entry.id} type="button" onClick={() => go({ id: "fooddetail", entryId: entry.id })}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: "1px solid var(--border-soft)", background: "none", cursor: "pointer", textAlign: "left", width: "100%" }}>
              <div className="vf-ico neutral"><BowlFood size={18} weight="fill" color="var(--text-2)" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{entry.name}</p>
                <p style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>{entry.meal} · {entry.portion}</p>
              </div>
              <p style={{ fontSize: 14, fontFamily: "var(--font-plex-mono)", fontWeight: 700, color: "var(--green)", flexShrink: 0 }}>{entry.calories}</p>
            </button>
          ))}
          {state.nutrition.entries.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600, padding: "12px 0" }}>No food logged today. Add your first meal.</p>
          )}
        </div>
      </div>

      <button type="button" className="vf-btn" onClick={() => go({ id: "foodlog" })}>
        <Plus size={16} weight="bold" /> Log food by ingredient
      </button>
    </div>
  );
}

// ─── Food Logger Screen (push) ────────────────────────────────────────────────

function FoodLogScreen({ onBack, onAdd }: { onBack: () => void; onAdd: (meal: FoodEntry["meal"], food: string) => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof foodCatalog[number] | null>(null);
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState<FoodEntry["meal"]>("Lunch");
  const recent = foodCatalog.slice(0, 6);

  const filtered = search.trim()
    ? foodCatalog.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : recent;

  const item = selected ?? foodCatalog[0];
  const factor = grams / 100;
  const liveKcal = Math.round((item?.calories ?? 165) * factor);
  const liveProtein = Math.round((item?.protein ?? 31) * factor);
  const liveCarbs = Math.round((item?.carbs ?? 0) * factor);
  const liveFat = Math.round((item?.fat ?? 3.6) * factor);

  const handleAdd = () => {
    if (item) { onAdd(meal, item.name); onBack(); }
  };

  return (
    <div className="slide-in" style={{ padding: "8px 16px 100px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="vf-seg">
        {(["Breakfast", "Lunch", "Snack", "Dinner"] as FoodEntry["meal"][]).map(m => (
          <button key={m} type="button" className={cn("vf-seg-btn", meal === m && "on")} onClick={() => setMeal(m)}>{m}</button>
        ))}
      </div>

      <div style={{ position: "relative" }}>
        <input className="vf-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients…" />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {filtered.map(f => (
          <button key={f.name} type="button" className={cn("vf-chip", selected?.name === f.name && "on")} onClick={() => { setSelected(f); setSearch(""); }}>
            {f.name}
          </button>
        ))}
      </div>

      {item && (
        <FlatCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 900 }}>{item.name}</p>
              <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>per 100g baseline</p>
            </div>
            <div className="vf-ico"><BowlFood size={20} weight="fill" color="var(--green)" /></div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600, marginTop: 6, lineHeight: 1.4 }}>{item.portion}</p>
        </FlatCard>
      )}

      <div>
        <p style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-2)", marginBottom: 8 }}>Portion (grams)</p>
        <div className="vf-stepper">
          <button type="button" className="vf-stepper-btn" onClick={() => setGrams(g => Math.max(10, g - 10))}>−</button>
          <div className="vf-stepper-val">
            <span style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--font-plex-mono)" }}>{grams}</span>
            <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>g</span>
          </div>
          <button type="button" className="vf-stepper-btn" onClick={() => setGrams(g => g + 10)}>+</button>
        </div>
      </div>

      <FlatCard>
        <Eyebrow>Live macros</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
          {[
            { label: "kcal",    val: liveKcal,    color: "var(--green)" },
            { label: "protein", val: `${liveProtein}g`, color: "var(--green)" },
            { label: "carbs",   val: `${liveCarbs}g`,  color: "var(--yellow)" },
            { label: "fat",     val: `${liveFat}g`,    color: "var(--blue)" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 16, fontWeight: 900, fontFamily: "var(--font-plex-mono)", color }}>{val}</p>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-3)", marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      </FlatCard>

      <div className="vf-footer" style={{ position: "static" }}>
        <button type="button" className="vf-btn" onClick={handleAdd}>
          <Plus size={16} weight="bold" /> Add to log
        </button>
      </div>
    </div>
  );
}

// ─── Food Detail Screen (push) ────────────────────────────────────────────────

function FoodDetailScreen({ entryId, state, onBack, onDelete }: { entryId: string; state: AppState; onBack: () => void; onDelete: (id: string) => void }) {
  const entry = state.nutrition.entries.find(e => e.id === entryId);
  if (!entry) return <div style={{ padding: 20 }}><p style={{ color: "var(--text-2)" }}>Food not found.</p></div>;
  const pct = (cal: number) => Math.round((cal / Math.max(entry.calories, 1)) * 100);
  return (
    <div className="slide-in" style={{ padding: "8px 16px 100px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ textAlign: "center", display: "flex", justifyContent: "center" }}>
        <Ring size={100} pct={1} sw={9}>
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, fontFamily: "var(--font-plex-mono)" }}>{entry.calories}</p>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3)" }}>kcal</p>
          </div>
        </Ring>
      </Card>
      <Card>
        <Eyebrow>Macro split</Eyebrow>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Protein", g: entry.protein, color: "var(--green)" },
            { label: "Carbs",   g: entry.carbs,   color: "var(--yellow)" },
            { label: "Fat",     g: entry.fat,      color: "var(--blue)" },
          ].map(({ label, g, color }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 800 }}>{label}</span>
                <span style={{ fontSize: 12, fontFamily: "var(--font-plex-mono)", fontWeight: 700, color }}>{g}g</span>
              </div>
              <div className="vf-bar thin"><div className="vf-bar-fill" style={{ width: `${pct(g * 4)}%`, background: color }} /></div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ padding: "6px 0" }}>
        <p style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 700 }}>Logged · {entry.meal}</p>
      </div>
      <div className="vf-footer" style={{ position: "static", gap: 10 }}>
        <button type="button" className="vf-btn-ghost vf-btn-sm" style={{ flex: "none" }} onClick={onBack}>Back</button>
        <button type="button" style={{ flex: 1, height: 46, borderRadius: "var(--r-sm)", border: "1px solid rgba(255,107,94,.3)", background: "rgba(255,107,94,.08)", color: "var(--red)", fontWeight: 900, fontSize: 14, cursor: "pointer" }}
          onClick={() => { onDelete(entryId); onBack(); }}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Profile Sheet ────────────────────────────────────────────────────────────

function ProfileSheet({ state, localMode, syncState, onSignOut, onLoadDemo, onReset, onClose }: {
  state: AppState; localMode: boolean; syncState: string;
  onSignOut: () => Promise<void>; onLoadDemo: () => void; onReset: () => void; onClose: () => void;
}) {
  const labels: Record<string, string> = { local: "Local only", loading: "Loading…", saving: "Saving…", synced: "Cloud synced", error: "Sync error", "signed-out": "Signed out" };
  const initials = (state.assessment.name || "VA").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "VA";
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "28px 28px 0 0", border: "1px solid var(--border-soft)", background: "rgba(10,10,11,.98)", paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: "rgba(245,245,246,.18)" }} />
        </div>
        <div style={{ padding: "12px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--elev)", border: "1px solid var(--green-line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "var(--text)", flexShrink: 0 }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-.04em" }}>{state.assessment.name || "Athlete"}</p>
              <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.assessment.school || "—"} · {state.assessment.position || "—"}</p>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--text-3)", marginTop: 2 }}>{labels[syncState] ?? syncState}</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" className="vf-btn" onClick={onLoadDemo}>Load demo athlete</button>
            <button type="button" className="vf-btn-ghost" onClick={onReset}>Reset all data</button>
            {!localMode && (
              <button type="button" onClick={() => void onSignOut()}
                style={{ height: 46, borderRadius: "var(--r-sm)", border: "1px solid rgba(255,107,94,.26)", background: "rgba(255,107,94,.08)", color: "var(--red)", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
                Sign out
              </button>
            )}
            <button type="button" onClick={onClose} style={{ height: 40, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--text-3)" }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const localMode = !hasSupabaseEnv();

  const [state, setState] = useState<AppState>(() => loadState() ?? createBlankState());
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(!localMode);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [syncState, setSyncState] = useState(localMode ? "local" : "signed-out");
  const [authError, setAuthError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [planSummary, setPlanSummary] = useState<string | null>(null);

  // Stack-based navigation
  const [stack, setStack] = useState<Screen[]>([{ id: "home" }]);
  const [rootTab, setRootTab] = useState<RootTab>("home");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const current = stack[stack.length - 1];
  const isRoot = stack.length === 1;

  const go = useCallback((s: Screen) => { setStack(prev => [...prev, s]); }, []);
  const replace = useCallback((s: Screen) => {
    setStack((prev) => (prev.length > 0 ? [...prev.slice(0, -1), s] : [s]));
  }, []);
  const back = useCallback(() => { setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev); }, []);
  const goTab = useCallback((tab: RootTab) => {
    setRootTab(tab);
    setStack([{ id: tab }]);
  }, []);

  // Auth listener
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void withTimeout(
      supabase.auth.getSession(),
      AUTH_TIMEOUT_MS,
      "Supabase auth check timed out.",
    )
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (!data.session) {
          setBootstrapLoading(false);
          setSyncState("signed-out");
        }
      })
      .catch((err) => {
        if (!active) return;
        setSession(null);
        setBootstrapLoading(false);
        setSyncState("signed-out");
        setAuthError(err instanceof Error ? err.message : "Unable to reach Supabase.");
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
        }
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
    const client = supabase, s = session;
    let cancelled = false;
    void (async () => {
      setBootstrapLoading(true); setSyncState("loading");
      try {
        await withTimeout(
          upsertRemoteProfile(client, s),
          REMOTE_TIMEOUT_MS,
          "Saving your profile to Supabase timed out.",
        );
        const remote = await withTimeout(
          loadRemoteState(client, s.user.id),
          REMOTE_TIMEOUT_MS,
          "Loading your training data timed out.",
        );
        if (cancelled) return;
        setState(remote ?? createBlankState()); setSyncState("synced");
      } catch (err) {
        if (cancelled) return;
        setAuthError(err instanceof Error ? err.message : "Unable to load cloud state.");
        setSyncState("error");
      } finally { if (!cancelled) setBootstrapLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [session, supabase]);

  // Auto-save
  useEffect(() => {
    if (localMode) { saveState(state); return; }
    if (!session || bootstrapLoading) return;
    const client = supabase!, s = session;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void (async () => {
        try { setSyncState("saving"); await upsertRemoteState(client, s, state); saveState(state); setSyncState("synced"); }
        catch { saveState(state); setSyncState("error"); }
      })();
    }, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [bootstrapLoading, localMode, session, state, supabase]);

  // Scroll to top on navigation
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [stack]);

  const scores = useMemo(() => getAssessmentScores(state.assessment), [state.assessment]);
  const nutritionTotals = useMemo(() => getNutritionTotals(state.nutrition.entries), [state.nutrition.entries]);

  function patchState(updater: (prev: AppState) => AppState) { setState(updater); }

  async function generatePlan(overrideState?: AppState) {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: overrideState ?? state }) });
      const payload = await res.json() as { generatedAt: string; weeks: AppState["plan"]["weeks"]; summary?: string };
      patchState(prev => ({ ...prev, onboardingComplete: true, selectedWeek: 1, plan: { generatedAt: payload.generatedAt, weeks: payload.weeks } }));
      if (payload.summary && !payload.summary.startsWith("Plan ready")) setPlanSummary(payload.summary);
      goTab("plan");
    } finally { setPlanLoading(false); }
  }

  async function handleOnboardComplete(data: OnboardData) {
    const assessment: AppState["assessment"] = {
      name: data.name, age: data.age, school: data.school, position: data.position,
      seasonGoal: data.seasonGoal, height: "", weight: "",
      pushups: Number(data.pushups), plankSeconds: Number(data.plankSeconds),
      wallSitSeconds: Number(data.wallSitSeconds), passing: Number(data.passing),
      shooting: Number(data.shooting), dribbling: Number(data.dribbling),
      firstTouch: Number(data.firstTouch), speed: Number(data.speed),
    };
    const newState = { ...state, assessment };
    patchState(() => newState);
    await generatePlan(newState);
  }

  async function sendCoach(prompt: string) {
    const trimmed = prompt.trim(); if (!trimmed) return;
    setCoachLoading(true);
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, text: trimmed, createdAt: new Date().toISOString() };
    patchState(prev => ({ ...prev, coach: { ...prev.coach, messages: [...prev.coach.messages, userMsg] } }));
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: trimmed, state }) });
      const payload = await res.json() as { answer: string[]; timestamp: string };
      patchState(prev => ({ ...prev, coach: { ...prev.coach, draft: "", messages: [...prev.coach.messages, { id: crypto.randomUUID(), role: "assistant" as const, text: payload.answer.join(" "), createdAt: payload.timestamp }] } }));
    } finally { setCoachLoading(false); }
  }

  function addMeal(meal: FoodEntry["meal"], foodName: string) {
    const match = foodCatalog.find(f => f.name === foodName) ?? foodCatalog[0];
    if (!match) return;
    patchState(prev => ({ ...prev, nutrition: { ...prev.nutrition, entries: [addFoodEntry(match.name, match.portion, meal), ...prev.nutrition.entries] } }));
  }

  function deleteEntry(id: string) {
    patchState(prev => ({ ...prev, nutrition: { ...prev.nutrition, entries: prev.nutrition.entries.filter(e => e.id !== id) } }));
  }

  function completeDrill(drillIndex: number) {
    let nextDrillIndex = -1;
    let completedCount = 0;

    patchState((prev) => {
      const completedDrillIndexes = Array.from(new Set([...prev.ui.sessionProgress.completedDrillIndexes, drillIndex])).sort((a, b) => a - b);
      completedCount = completedDrillIndexes.length;
      nextDrillIndex = getNextQueuedDrillIndex(completedDrillIndexes);
      const sessionFinished = completedCount >= SESSION_DRILLS.length;

      return {
        ...prev,
        plan: {
          ...prev.plan,
          weeks: sessionFinished ? advancePlanSessions(prev.plan.weeks) : prev.plan.weeks,
        },
        ui: {
          ...prev.ui,
          sessionProgress: sessionFinished
            ? { currentDrillIndex: 0, completedDrillIndexes: [] }
            : { currentDrillIndex: nextDrillIndex, completedDrillIndexes },
        },
      };
    });

    if (completedCount >= SESSION_DRILLS.length || nextDrillIndex === -1) {
      replace({ id: "recap", drillName: SESSION_DRILLS[drillIndex]?.name ?? "your session", completedCount });
      return;
    }

    replace({ id: "drill", idx: nextDrillIndex });
  }

  function skipDrill() {
    replace({ id: "session" });
  }

  async function handleAuthSubmit(mode: "sign-in" | "sign-up", email: string, password: string) {
    if (!supabase) return;
    setAuthError(null); setAuthLoading(true);
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) { setAuthError(result.error.message); setAuthLoading(false); return; }
    if (mode === "sign-up" && !result.data.session) { setAuthError("Account created! Check your email to confirm, then sign in."); setAuthLoading(false); }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    clearState(); setState(createBlankState()); setSession(null);
    setBootstrapLoading(false); setSyncState("signed-out"); setAuthLoading(false);
    setDemoMode(false); setPlanSummary(null);
  }

  function loadDemo() { setState(createDemoState()); setDemoMode(true); setShowProfile(false); goTab("home"); setPlanSummary(null); }
  function resetAll() { setState(createBlankState()); clearState(); setShowProfile(false); setDemoMode(false); setPlanSummary(null); }

  // Gates
  if (!localMode && !demoMode && (authLoading || bootstrapLoading)) return <LoadingScreen message="Loading your profile…" />;
  if (!localMode && !demoMode && !session) return <AuthScreen loading={authLoading} error={authError} onSubmit={handleAuthSubmit} onDemo={loadDemo} />;
  if (!state.onboardingComplete) return <OnboardingWizard onComplete={handleOnboardComplete} onSkip={loadDemo} />;

  const showNav = !["drill", "recap"].includes(current.id);
  const isFixed = current.id === "coach";
  const screenTitle: Partial<Record<Screen["id"], string>> = { benchmark: "Benchmark", session: "Today's Session", drill: "Active Drill", recap: "Session Recap", skill: "Skill Detail", nutrition: "Nutrition / Today", foodlog: "Log Food", fooddetail: "Food Detail" };

  function renderScreen() {
    switch (current.id) {
      case "home":    return <HomeScreen state={state} scores={scores} nutritionTotals={nutritionTotals} go={go} goTab={goTab} onGeneratePlan={() => generatePlan()} planLoading={planLoading} />;
      case "plan":    return <PlanScreen state={state} onSelectWeek={w => patchState(prev => ({ ...prev, selectedWeek: w }))} go={go} onGeneratePlan={() => generatePlan()} planLoading={planLoading} planSummary={planSummary} />;
      case "track":   return <TrackScreen state={state} scores={scores} go={go} />;
      case "coach":   return <CoachScreen state={state} onSend={sendCoach} busy={coachLoading} />;
      case "benchmark": return <BenchmarkScreen state={state} scores={scores} onBack={back} go={go} goTab={goTab} />;
      case "session": return <SessionScreen state={state} onBack={back} go={go} />;
      case "drill":   return <DrillScreen key={current.idx} idx={current.idx} state={state} onBack={back} onCompleteDrill={completeDrill} onSkipDrill={skipDrill} />;
      case "recap":   return <RecapScreen drillName={current.drillName} completedCount={current.completedCount} state={state} onBack={back} onContinue={back} goTab={goTab} />;
      case "skill":   return <SkillScreen name={current.name} state={state} onBack={back} goTab={goTab} />;
      case "nutrition": return <NutritionScreen state={state} totals={nutritionTotals} go={go} onAddMeal={addMeal} />;
      case "foodlog": return <FoodLogScreen onBack={back} onAdd={addMeal} />;
      case "fooddetail": return <FoodDetailScreen entryId={current.entryId} state={state} onBack={back} onDelete={deleteEntry} />;
      default: return null;
    }
  }

  const tabTitles: Record<RootTab, string> = { home: "VarFoot", plan: "Plan", track: "Progress", coach: "Coach" };
  const title = isRoot ? tabTitles[rootTab] : (screenTitle[current.id] ?? "");

  return (
    <div className="phone-shell">
      <div className="phone-column">
        {isRoot
          ? <TopBar title={title} streak={12} onAvatarTap={() => setShowProfile(true)} />
          : <BackBar title={title} onBack={back} />
        }

        {authError && !showProfile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "rgba(255,107,94,.08)", borderBottom: "1px solid rgba(255,107,94,.14)", color: "var(--red)", fontSize: 13, fontWeight: 600 }}>
            <span style={{ flex: 1 }}>{authError}</span>
            <button type="button" onClick={() => setAuthError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)" }}><X size={16} /></button>
          </div>
        )}

        <div ref={contentRef} className={cn("content-area", isFixed ? "content-fixed" : "content-scroll")}>
          {renderScreen()}
        </div>

        {showNav && <BottomNav active={rootTab} onSelect={goTab} />}
        {showProfile && <ProfileSheet state={state} localMode={localMode} syncState={syncState} onSignOut={handleSignOut} onLoadDemo={loadDemo} onReset={resetAll} onClose={() => setShowProfile(false)} />}
      </div>
    </div>
  );
}

export default function Page() { return <App />; }
