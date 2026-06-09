"use client";

// Shared design-system primitives — split out of the old monolithic page.tsx so every
// rebuilt screen (onboarding, readiness, roadmap, drill, progress, nutrition, coach)
// draws from the same dark/neon-green visual language. CSS classes (vf-card, vf-btn,
// vf-bar, etc.) live in src/app/globals.css.

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CaretLeft, Fire, Minus, Pause, Play, Plus, ArrowCounterClockwise } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { Drill } from "@/data/drillCatalog";
import { progressFraction, type ScoreAnchors } from "@/lib/scoring";
import { formatDuration } from "@/lib/varfoot";

export function Eyebrow({ children, tone = "muted", className = "" }: { children: ReactNode; tone?: "muted" | "green" | "gold" | "blue"; className?: string }) {
  const color = tone === "green" ? "var(--green)" : tone === "gold" ? "var(--yellow)" : tone === "blue" ? "var(--blue)" : "var(--text-3)";
  return <p className={cn("text-[10px] font-black uppercase tracking-[.14em]", className)} style={{ color }}>{children}</p>;
}

export function Card({ children, className = "", style, onClick }: { children: ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <div className={cn("vf-card", className)} onClick={onClick} style={{ ...(onClick ? { cursor: "pointer" } : {}), ...style }}>{children}</div>;
}

export function FlatCard({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={cn("vf-card-flat", className)} style={style}>{children}</div>;
}

export function HiCard({ children, className = "", style, onClick }: { children: ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <div className={cn("vf-card-hi", className)} onClick={onClick} style={{ ...(onClick ? { cursor: "pointer" } : {}), ...style }}>{children}</div>;
}

export function Btn({ children, onClick, disabled, className = "", ghost = false, sm = false }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; ghost?: boolean; sm?: boolean }) {
  const base = ghost ? "vf-btn-ghost" : "vf-btn";
  return <button type="button" className={cn(base, sm && "vf-btn-sm", className)} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Ring({ size, pct, sw = 7, color = "var(--green)", children }: { size: number; pct: number; sw?: number; color?: string; children?: ReactNode }) {
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, Math.max(0, pct));
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--elev)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
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

export function Radar({ you, tgt, axes, size = 160 }: { you: number[]; tgt: number[]; axes: string[]; size?: number }) {
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

/**
 * Direction-aware progress bar for any scored metric — replaces the old metric-keyed
 * BenchmarkBar. Fill comes from scoring.ts's progressFraction (clamped, direction-aware,
 * never shows a below-freshman result as full) and the freshman/JV/varsity markers are
 * placed at their true anchor scores (40/70/100) so the bar always reads correctly
 * regardless of whether the metric counts up or counts down.
 */
export function MetricBar({
  label,
  value,
  unit,
  anchors,
}: {
  label: string;
  value: number | null;
  unit: string;
  anchors: ScoreAnchors;
}) {
  const fraction = value == null ? 0 : progressFraction(value, anchors);
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-plex-mono)", color: "var(--green)", fontWeight: 700 }}>
          {value == null ? "—" : `${value}${unit}`}
        </span>
      </div>
      <div className="vf-bar" style={{ position: "relative" }}>
        <div className="vf-bar-fill" style={{ width: `${fraction * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * Start/Stop/Reset countdown or count-up timer with a circular Ring readout — used by the
 * onboarding's timed drills (plank hold, wall sit, 1-minute juggling windows, etc).
 * `targetSeconds` drives the ring fill; passing 0 makes it count up indefinitely instead.
 */
export function Timer({
  targetSeconds = 0,
  fillTargetSeconds = 0,
  precision = 0,
  onComplete,
  onStop,
}: {
  targetSeconds?: number;
  /** For open-ended stopwatch drills (plank hold, wall sit): drives the ring fill toward
   * a benchmark duration (e.g. the varsity target) without counting down or auto-stopping. */
  fillTargetSeconds?: number;
  /** Decimal places to track and display — sprint/agility drills are won or lost by tenths
   * or hundredths of a second, so whole-second ticks are too coarse to be useful there. */
  precision?: 0 | 1 | 2;
  /** Fires once when a fixed-length countdown reaches zero (e.g. the 60s weak-foot window). */
  onComplete?: (elapsedSeconds: number) => void;
  /** Fires every time the player pauses — the elapsed time at that moment is the
   * recorded value for open-ended stopwatch drills (plank hold, cone slalom, etc). */
  onStop?: (elapsedSeconds: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (running) {
      if (precision > 0) {
        lastTickRef.current = Date.now();
        intervalRef.current = setInterval(() => {
          const now = Date.now();
          const delta = (now - lastTickRef.current) / 1000;
          lastTickRef.current = now;
          setElapsed((s) => s + delta);
        }, 30);
      } else {
        intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, precision]);

  useEffect(() => {
    if (targetSeconds > 0 && elapsed >= targetSeconds && running && !completedRef.current) {
      completedRef.current = true;
      setRunning(false);
      onComplete?.(elapsed);
    }
  }, [elapsed, targetSeconds, running, onComplete]);

  const round = (seconds: number) => (precision > 0 ? Number(seconds.toFixed(precision)) : Math.round(seconds));

  const toggle = () => {
    if (running) onStop?.(round(elapsed));
    setRunning((wasRunning) => !wasRunning);
  };

  const reset = () => {
    if (running && elapsed > 0) onStop?.(0);
    setRunning(false);
    setElapsed(0);
    completedRef.current = false;
  };

  const ringTarget = targetSeconds > 0 ? targetSeconds : fillTargetSeconds;
  const pct = ringTarget > 0 ? Math.min(1, elapsed / ringTarget) : 0;
  const display = targetSeconds > 0 ? Math.max(0, targetSeconds - elapsed) : elapsed;
  const displayLabel = precision > 0 ? `${display.toFixed(precision)}s` : formatDuration(display);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <Ring size={140} pct={ringTarget > 0 ? pct : 1} sw={9}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--font-plex-mono)", lineHeight: 1 }}>{displayLabel}</p>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-3)", marginTop: 4 }}>
            {targetSeconds > 0 ? "remaining" : "elapsed"}
          </p>
        </div>
      </Ring>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="vf-btn-ghost vf-btn-sm" onClick={reset}>
          <ArrowCounterClockwise size={16} weight="bold" /> Reset
        </button>
        <button type="button" className="vf-btn vf-btn-sm" onClick={toggle}>
          {running ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />} {running ? "Stop" : elapsed > 0 ? "Resume" : "Start"}
        </button>
      </div>
    </div>
  );
}

/** Plus/minus number control sharing the .vf-stepper visual language — used for every
 * count/checkin drill capture (onboarding slides, drill detail logging). */
export function Stepper({
  display,
  onDecrement,
  onIncrement,
}: {
  display: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="vf-stepper">
      <button type="button" className="vf-stepper-btn" onClick={onDecrement} aria-label="Decrease">
        <Minus size={18} weight="bold" />
      </button>
      <div className="vf-stepper-val">
        <span className="vf-stepper-display" style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 900, fontFamily: "var(--font-plex-mono)" }}>{display}</span>
      </div>
      <button type="button" className="vf-stepper-btn" onClick={onIncrement} aria-label="Increase">
        <Plus size={18} weight="bold" />
      </button>
    </div>
  );
}

/** Per-checkin nudge size — derived from the drill's real-world unit (kcal/fl oz/hours),
 * not its raw target number. Keyed by id since only the 3 check-in drills need this. */
export const CHECKIN_STEP: Record<string, number> = {
  "daily-calories": 250,
  "daily-water": 8,
  "sleep-duration": 0.5,
};

export type DrillDraft = { value: number | null; skipped: boolean };

/**
 * Renders the correct capture control for a drill's `inputType` — count stepper
 * (optionally "X of Y"), Start/Stop stopwatch, fixed-window timer + count, or a
 * checkin nudge field. Shared by onboarding slides and drill-detail logging so every
 * measurement flows through one widget per input type. See docs/scoring-model.md.
 */
export function DrillCapture({
  drill,
  draft,
  onChange,
}: {
  drill: Drill;
  draft: DrillDraft | undefined;
  onChange: (value: number | null, skipped: boolean) => void;
}) {
  const value = draft?.value ?? null;

  if (drill.inputType === "count") {
    const max = drill.maxAttempts ?? null;
    const current = value ?? 0;
    return (
      <Stepper
        display={max ? `${current} / ${max}` : `${current} ${drill.unit}`}
        onDecrement={() => onChange(Math.max(0, current - 1), false)}
        onIncrement={() => onChange(max ? Math.min(max, current + 1) : current + 1, false)}
      />
    );
  }

  if (drill.inputType === "timed") {
    // Sprints/agility shuttles are a race against the clock — a plain stopwatch counting up
    // in hundredths reads naturally against sub-5-second targets. Holds (plank, wall sit,
    // balance) are the opposite: open-ended, so the ring just fills toward the benchmark.
    const isRaceAgainstClock = drill.scoreDirection === "lower_is_better";
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <Timer
          key={`${drill.id}-timer`}
          fillTargetSeconds={drill.scoreDirection === "higher_is_better" ? drill.varsityTarget : 0}
          precision={isRaceAgainstClock ? 2 : 0}
          onStop={(elapsed) => { if (elapsed > 0) onChange(elapsed, false); }}
        />
        {value != null && (
          <p style={{ fontSize: 12, fontWeight: 800, color: "var(--green)" }}>
            Recorded: {isRaceAgainstClock ? value.toFixed(2) : value}s — start again to overwrite
          </p>
        )}
      </div>
    );
  }

  if (drill.inputType === "timed_count") {
    const current = value ?? 0;
    const label = drill.unit.split(" / ")[0];
    // Derive the counter label from the drill's unit (e.g. "passes", "reps", "clean jumps")
    // rather than hardcoding — so any timed_count drill reads correctly.
    const countNoun = label.length > 0 ? `${label} completed in the window` : "Completed in the window";
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <Timer key={`${drill.id}-timer`} targetSeconds={drill.timerSeconds ?? 60} />
        <div style={{ width: "100%", maxWidth: 280 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", textAlign: "center", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>
            {countNoun}
          </p>
          <Stepper
            display={`${current} ${label}`}
            onDecrement={() => onChange(Math.max(0, current - 1), false)}
            onIncrement={() => onChange(current + 1, false)}
          />
        </div>
      </div>
    );
  }

  // checkin
  const step = CHECKIN_STEP[drill.id] ?? 1;
  const current = value ?? 0;
  const display = Number.isInteger(step) ? `${current}` : current.toFixed(1);
  return (
    <Stepper
      display={`${display} ${drill.unit}`}
      onDecrement={() => onChange(Math.max(0, Math.round((current - step) * 10) / 10), false)}
      onIncrement={() => onChange(Math.round((current + step) * 10) / 10, false)}
    />
  );
}

export function LoadingScreen({ message }: { message: string }) {
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

export function BackBar({ title, sub, onBack, action }: { title: string; sub?: string; onBack: () => void; action?: ReactNode }) {
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

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function TopBar({ title, streak, onAvatarTap, initials = "VA" }: { title: string; streak: number; onAvatarTap: () => void; initials?: string }) {
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
          {initials}
        </button>
      </div>
    </div>
  );
}

export type RootTab = "today" | "plan" | "train" | "fuel" | "coach";

export const NAV_TAB_LABELS: Record<RootTab, string> = {
  today: "Today",
  plan: "Plan",
  train: "Train",
  fuel: "Fuel",
  coach: "Coach",
};
