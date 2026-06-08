"use client";

// Duolingo-style assessment wizard: Profile → Physical → Nutrition/Recovery → Technical → Done.
// Walks the player through every onboarding-measured drill (the 6 physical/nutrition/recovery
// check-ins + the 13 PDF skill drills) one slide at a time, then hands the populated
// assessment + drillResults back to the App shell, which routes to Varsity Readiness
// (never straight home — see docs/scoring-model.md "Varsity Readiness composite").
//
// Renders only its app-bar / content / footer — the App shell supplies the outer
// phone-shell/phone-column frame, matching every other screen in src/components/screens.

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldWarning,
  SkipForward,
  Sparkle,
  Users,
} from "@phosphor-icons/react";

import { Btn, DrillCapture, Eyebrow, Stepper, type DrillDraft } from "@/components/ui";
import { onboardingPhysicalDrills, onboardingTechnicalDrills, type Drill } from "@/data/drillCatalog";
import {
  blankAssessment,
  currentTeamLevels,
  formatHeight,
  teamLevelLabels,
  targetTeamLevels,
  type AssessmentState,
  type DrillResult,
  type TeamLevel,
} from "@/lib/varfoot";
import { cn } from "@/lib/utils";

type SectionId = "profile" | "physical" | "recovery" | "technical";

const SECTION_LABELS: Record<SectionId, string> = {
  profile: "Profile",
  physical: "Physical",
  recovery: "Nutrition & recovery",
  technical: "Technical skills",
};

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

const POSITION_OPTIONS = [
  "Goalkeeper",
  "Center back",
  "Outside back",
  "Defensive midfield",
  "Central midfield",
  "Attacking midfield",
  "Winger",
  "Striker",
] as const;

type ProfileStepId = "identity" | "body" | "goal";

type Step =
  | { kind: "profile"; id: ProfileStepId; section: "profile" }
  | { kind: "drill"; drill: Drill; section: "physical" | "recovery" | "technical" }
  | { kind: "done" };

// onboardingPhysicalDrills is catalog-ordered: pushups, plank, wall-sit (physical) then
// calories, water, sleep (nutrition/recovery) — see drillCatalog.ts.
const PHYSICAL_DRILLS = onboardingPhysicalDrills.slice(0, 3);
const RECOVERY_DRILLS = onboardingPhysicalDrills.slice(3);

const STEPS: Step[] = [
  { kind: "profile", id: "identity", section: "profile" },
  { kind: "profile", id: "body", section: "profile" },
  { kind: "profile", id: "goal", section: "profile" },
  ...PHYSICAL_DRILLS.map((drill): Step => ({ kind: "drill", drill, section: "physical" })),
  ...RECOVERY_DRILLS.map((drill): Step => ({ kind: "drill", drill, section: "recovery" })),
  ...onboardingTechnicalDrills.map((drill): Step => ({ kind: "drill", drill, section: "technical" })),
  { kind: "done" },
];

const TOTAL_MEASURED_STEPS = STEPS.filter((s) => s.kind === "drill").length;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{children}</p>;
}

function LevelPicker({
  levels,
  value,
  onChange,
  allowUnset,
}: {
  levels: readonly TeamLevel[];
  value: TeamLevel | null;
  onChange: (level: TeamLevel) => void;
  allowUnset?: boolean;
}) {
  return (
    <div
      className="vf-seg"
      style={{
        display: "grid",
        gridTemplateColumns: levels.length > 3 ? "repeat(2, minmax(0, 1fr))" : `repeat(${levels.length}, minmax(0, 1fr))`,
        gap: 4,
      }}
    >
      {levels.map((level) => (
        <button
          key={level}
          type="button"
          className={cn("vf-seg-btn", value === level && "on")}
          onClick={() => onChange(level)}
          style={{ minHeight: 42, whiteSpace: "normal", lineHeight: 1.2 }}
        >
          {teamLevelLabels[level]}
        </button>
      ))}
      {allowUnset && value == null && (
        <span style={{ position: "absolute" }} />
      )}
    </div>
  );
}

export function Onboarding({
  initialAssessment,
  onComplete,
}: {
  initialAssessment?: AssessmentState;
  onComplete: (assessment: AssessmentState, drillResults: Record<string, DrillResult>) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [assessment, setAssessment] = useState<AssessmentState>(initialAssessment ?? { ...blankAssessment });
  const [drafts, setDrafts] = useState<Record<string, DrillDraft>>({});

  const step = STEPS[stepIndex];
  const measuredSoFar = STEPS.slice(0, stepIndex).filter((s) => s.kind === "drill").length;
  const stepCounter = step.kind === "done"
    ? `${TOTAL_MEASURED_STEPS}/${TOTAL_MEASURED_STEPS}`
    : step.kind === "drill"
      ? `${measuredSoFar + 1}/${TOTAL_MEASURED_STEPS}`
      : `${stepIndex + 1}/3`;

  const updateAssessment = (patch: Partial<AssessmentState>) => setAssessment((prev) => ({ ...prev, ...patch }));

  const setDrillDraft = (drillId: string, value: number | null, skipped: boolean) =>
    setDrafts((prev) => ({ ...prev, [drillId]: { value, skipped } }));

  const canContinue = useMemo(() => {
    if (step.kind === "profile") {
      if (step.id === "identity") return assessment.name.trim().length > 0;
      if (step.id === "body") return assessment.currentLevel != null;
      return true;
    }
    if (step.kind === "drill") {
      const draft = drafts[step.drill.id];
      return draft != null && (draft.skipped || draft.value != null);
    }
    return true;
  }, [step, assessment, drafts]);

  const goNext = () => {
    if (step.kind === "done") {
      const results: Record<string, DrillResult> = {};
      for (const [drillId, draft] of Object.entries(drafts)) {
        results[drillId] = {
          drillId,
          value: draft.skipped ? null : draft.value,
          recordedAt: new Date().toISOString(),
          skipped: draft.skipped || undefined,
        };
      }
      onComplete(assessment, results);
      return;
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const progress = step.kind === "done" ? 1 : (stepIndex + 1) / (STEPS.length - 1);

  return (
    <>
      <div className="app-bar" style={{ flexDirection: "column", alignItems: "stretch", height: "auto", paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 12, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: stepIndex === 0 ? "default" : "pointer", color: stepIndex === 0 ? "var(--text-3)" : "var(--green)", fontWeight: 800, fontSize: 13, opacity: stepIndex === 0 ? 0.4 : 1 }}
          >
            <ArrowLeft size={17} weight="bold" /> Back
          </button>
          <Eyebrow tone="green">{step.kind === "done" ? "Assessment complete" : SECTION_LABELS[step.section]}</Eyebrow>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-3)", fontFamily: "var(--font-plex-mono)" }}>
            {stepCounter}
          </span>
        </div>
        <div className="vf-bar thin">
          <div className="vf-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>

      <div className="content-area content-scroll" style={{ padding: "20px 18px 8px" }}>
        {step.kind === "profile" && step.id === "identity" && (
          <IdentitySlide assessment={assessment} onChange={updateAssessment} />
        )}
        {step.kind === "profile" && step.id === "body" && (
          <BodySlide assessment={assessment} onChange={updateAssessment} />
        )}
        {step.kind === "profile" && step.id === "goal" && (
          <GoalSlide assessment={assessment} onChange={updateAssessment} />
        )}
        {step.kind === "drill" && (
          <DrillSlide
            drill={step.drill}
            sectionLabel={SECTION_LABELS[step.section]}
            draft={drafts[step.drill.id]}
            onChange={(value, skipped) => setDrillDraft(step.drill.id, value, skipped)}
          />
        )}
        {step.kind === "done" && <DoneSlide assessment={assessment} drafts={drafts} />}
      </div>

      <div className="vf-footer">
        <Btn className="w-full" onClick={goNext} disabled={!canContinue}>
          {step.kind === "done" ? (
            <>See my Varsity Readiness <Sparkle size={16} weight="fill" /></>
          ) : (
            <>Continue <ArrowRight size={16} weight="bold" /></>
          )}
        </Btn>
      </div>
    </>
  );
}

// ── Profile slides ──────────────────────────────────────────────────────────

function SlideHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <Eyebrow tone="green">{eyebrow}</Eyebrow>
      <h1 style={{ fontSize: 23, fontWeight: 900, letterSpacing: "-.03em", marginTop: 4, marginBottom: 6 }}>{title}</h1>
      <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.5 }}>{sub}</p>
    </div>
  );
}

function IdentitySlide({ assessment, onChange }: { assessment: AssessmentState; onChange: (patch: Partial<AssessmentState>) => void }) {
  return (
    <div>
      <SlideHeading eyebrow="Step 1 · Profile" title="Tell us about you" sub="This frames the assessment around your age and position so the training plan feels tailored to you." />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Full name</FieldLabel>
          <input className="vf-input" placeholder="e.g. Jordan Reyes" value={assessment.name} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Age</FieldLabel>
            <input className="vf-input" inputMode="numeric" placeholder="16" value={assessment.age} onChange={(e) => onChange({ age: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })} />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Position</FieldLabel>
            <select className="vf-input" value={assessment.position} onChange={(e) => onChange({ position: e.target.value })}>
              <option value="">Select your position</option>
              {POSITION_OPTIONS.map((position) => (
                <option key={position} value={position}>{position}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function BodySlide({ assessment, onChange }: { assessment: AssessmentState; onChange: (patch: Partial<AssessmentState>) => void }) {
  const heightInches = assessment.heightInches ?? 66;
  const weightLbs = assessment.weightLbs ?? 140;
  return (
    <div>
      <SlideHeading eyebrow="Step 2 · Profile" title="Body & current level" sub="Used to frame your starting point — not for grading. Where are you on the team ladder right now?" />
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Height</FieldLabel>
            <Stepper
              display={formatHeight(heightInches)}
              onDecrement={() => onChange({ heightInches: Math.max(48, heightInches - 1) })}
              onIncrement={() => onChange({ heightInches: Math.min(84, heightInches + 1) })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Weight</FieldLabel>
            <Stepper
              display={`${weightLbs} lbs`}
              onDecrement={() => onChange({ weightLbs: Math.max(80, weightLbs - 5) })}
              onIncrement={() => onChange({ weightLbs: Math.min(260, weightLbs + 5) })}
            />
          </div>
        </div>
        <div>
          <FieldLabel>Current team level</FieldLabel>
          <LevelPicker levels={currentTeamLevels} value={assessment.currentLevel} onChange={(level) => onChange({ currentLevel: level })} allowUnset />
        </div>
        <div>
          <FieldLabel>Target team level</FieldLabel>
          <LevelPicker levels={targetTeamLevels} value={assessment.targetLevel} onChange={(level) => onChange({ targetLevel: level })} />
        </div>
      </div>
    </div>
  );
}

function GoalSlide({ assessment, onChange }: { assessment: AssessmentState; onChange: (patch: Partial<AssessmentState>) => void }) {
  const toggleDay = (day: number) => {
    const exists = assessment.availableDays.includes(day);
    const next = exists
      ? assessment.availableDays.filter((value) => value !== day)
      : [...assessment.availableDays, day].sort((a, b) => a - b);
    onChange({ availableDays: next });
  };

  return (
    <div>
      <SlideHeading eyebrow="Step 3 · Profile" title="Your tryout goal" sub="We use this to build your training roadmap and pace your sessions toward the right date." />
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <FieldLabel>Tryout date (optional)</FieldLabel>
          <input
            type="date"
            className="vf-input"
            value={assessment.tryoutDate ?? ""}
            onChange={(e) => onChange({ tryoutDate: e.target.value || null })}
          />
          {!assessment.tryoutDate && (
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, lineHeight: 1.5 }}>
              No date yet? That&rsquo;s fine — you can add one later and we&rsquo;ll rebuild your roadmap around it.
            </p>
          )}
        </div>
        <div>
          <FieldLabel>Training days per week — {assessment.trainingDaysPerWeek}</FieldLabel>
          <Stepper
            display={`${assessment.trainingDaysPerWeek}x / week`}
            onDecrement={() => onChange({ trainingDaysPerWeek: Math.max(1, assessment.trainingDaysPerWeek - 1) })}
            onIncrement={() => onChange({ trainingDaysPerWeek: Math.min(7, assessment.trainingDaysPerWeek + 1) })}
          />
        </div>
        <div>
          <FieldLabel>Available days</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 8 }}>
            {WEEKDAYS.map((day) => {
              const selected = assessment.availableDays.includes(day.value);
              return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                style={{
                  minHeight: 42,
                  borderRadius: "var(--r-sm)",
                  border: `1px solid ${selected ? "var(--green-line)" : "var(--border-soft)"}`,
                  background: selected ? "var(--green-ghost)" : "var(--surface-2)",
                  color: selected ? "var(--green)" : "var(--text-2)",
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: "var(--font-nunito), sans-serif",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {day.label}
              </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, lineHeight: 1.5 }}>
            Optional exact weekdays. Leave this blank if your availability shifts week to week.
          </p>
        </div>
        <div>
          <FieldLabel>Weight / performance goal</FieldLabel>
          <input
            className="vf-input"
            placeholder="e.g. add lean mass, improve first-step quickness, build engine"
            value={assessment.goalFocus}
            onChange={(e) => onChange({ goalFocus: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Drill slide ─────────────────────────────────────────────────────────────

function DrillSlide({
  drill,
  sectionLabel,
  draft,
  onChange,
}: {
  drill: Drill;
  sectionLabel: string;
  draft: DrillDraft | undefined;
  onChange: (value: number | null, skipped: boolean) => void;
}) {
  return (
    <div>
      <Eyebrow tone="green">{sectionLabel}</Eyebrow>
      <h1 style={{ fontSize: 21, fontWeight: 900, letterSpacing: "-.03em", marginTop: 4, marginBottom: 14 }}>{drill.name}</h1>

      <div className="vf-card-flat" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
        <Image src={drill.imagePath} alt={drill.name} width={400} height={240} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        <InfoRow label="Setup" text={drill.setup} />
        <InfoRow label="Action" text={drill.action} />
        <InfoRow label="Measurement" text={drill.measurement} />
      </div>

      {drill.requiresPartner && drill.safetyNotes && (
        <div className="vf-card-flat" style={{ borderColor: "var(--yellow)", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18 }}>
          <ShieldWarning size={18} weight="fill" color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 900, color: "var(--yellow)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
              Needs a partner — read before you start
            </p>
            <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>{drill.safetyNotes}</p>
          </div>
        </div>
      )}

      <div className="vf-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {draft?.skipped ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text-2)" }}>Marked as skipped</p>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>You can log this from the drill library once you&rsquo;re ready.</p>
            <button
              type="button"
              onClick={() => onChange(null, false)}
              style={{ marginTop: 10, background: "none", border: "none", color: "var(--green)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}
            >
              Undo — I can do this now
            </button>
          </div>
        ) : (
          <DrillCapture drill={drill} draft={draft} onChange={onChange} />
        )}
      </div>

      {!draft?.skipped && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button
            type="button"
            onClick={() => onChange(null, true)}
            style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            {drill.requiresPartner ? <Users size={14} weight="bold" /> : <SkipForward size={14} weight="bold" />}
            {drill.requiresPartner ? "No partner right now — skip for later" : "Skip this drill for now"}
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="vf-card-flat" style={{ padding: "12px 14px" }}>
      <p style={{ fontSize: 10, fontWeight: 900, color: "var(--green)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

// ── Done slide ──────────────────────────────────────────────────────────────

function DoneSlide({ assessment, drafts }: { assessment: AssessmentState; drafts: Record<string, DrillDraft> }) {
  const measured = Object.values(drafts).filter((d) => !d.skipped && d.value != null).length;
  const skipped = Object.values(drafts).filter((d) => d.skipped).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 24 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--green-ghost)", border: "1px solid var(--green-line)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <Check size={32} weight="bold" color="var(--green)" />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-.03em", marginBottom: 8 }}>
        Nice work, {assessment.name.split(" ")[0] || "athlete"}.
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6, maxWidth: 320 }}>
        You logged {measured} drill{measured === 1 ? "" : "s"}{skipped > 0 ? ` and skipped ${skipped} for later` : ""}. Your Varsity Readiness score weighs technical, physical, speed, nutrition, and plan-readiness — built entirely from what you just measured.
      </p>
    </div>
  );
}
