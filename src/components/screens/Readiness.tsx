"use client";

// Varsity Readiness summary — the screen onboarding routes to on completion (never straight
// home). Composite score + level classification come from src/lib/readiness.ts (single
// source of truth shared with the AI coach context). See docs/scoring-model.md.

import { ArrowRight, Lightning, ListMagnifyingGlass, Sparkle, Trophy } from "@phosphor-icons/react";

import { BackBar, Btn, Card, Eyebrow, FlatCard, Radar, Ring } from "@/components/ui";
import { readinessLevelLabels } from "@/lib/scoring";
import type { ReadinessSummary } from "@/lib/readiness";
import { cn } from "@/lib/utils";

const LEVEL_TONE: Record<ReadinessSummary["level"], string> = {
  "below-freshman": "var(--red)",
  freshman: "var(--yellow)",
  jv: "var(--blue)",
  "varsity-ready": "var(--green)",
};

const LEVEL_BLURB: Record<ReadinessSummary["level"], string> = {
  "below-freshman": "You're earlier in the journey than your target — that's exactly what a roadmap is for.",
  freshman: "You're tracking around freshman level. The gaps below are your fastest path up.",
  jv: "You're firmly in JV range — close the remaining gaps and varsity is within reach.",
  "varsity-ready": "Your measured numbers are at or above varsity targets. Keep the reps consistent to hold this level.",
};

export function Readiness({
  summary,
  isFirstRun,
  onViewGaps,
  onGeneratePlan,
  onContinue,
}: {
  summary: ReadinessSummary;
  /** True right after onboarding — changes the primary CTA from "back to today" to "build my plan". */
  isFirstRun: boolean;
  onViewGaps: () => void;
  onGeneratePlan: () => void;
  onContinue: () => void;
}) {
  const tone = LEVEL_TONE[summary.level];
  const axes = summary.categories.map((c) => c.label.split(" ")[0]);
  const you = summary.categories.map((c) => Math.round(c.score));
  const target = summary.categories.map(() => 100);

  return (
    <>
      <BackBar title="Varsity Readiness" sub="Your composite score" onBack={onContinue} />
      <div className="content-area content-scroll" style={{ padding: "20px 18px 28px" }}>
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, marginBottom: 18 }}>
          <Ring size={150} pct={summary.overall / 100} sw={11} color={tone}>
            <div>
              <p style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--font-plex-mono)", lineHeight: 1, color: tone }}>{Math.round(summary.overall)}</p>
              <p style={{ fontSize: 10, fontWeight: 800, color: "var(--text-3)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 2 }}>/ 100</p>
            </div>
          </Ring>
          <div>
            <Eyebrow tone={summary.level === "varsity-ready" ? "green" : summary.level === "jv" ? "blue" : "gold"}>
              {readinessLevelLabels[summary.level]}
            </Eyebrow>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, maxWidth: 320, marginTop: 6 }}>{LEVEL_BLURB[summary.level]}</p>
          </div>
        </Card>

        <FlatCard style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
          <Eyebrow>Five-category breakdown</Eyebrow>
          <div style={{ marginTop: 8 }}>
            <Radar you={you} tgt={target} axes={axes} size={190} />
          </div>
        </FlatCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {summary.categories.map((category) => (
            <FlatCard key={category.key}>
              <div className="flex justify-between items-center mb-1.5">
                <span style={{ fontSize: 13, fontWeight: 800 }}>{category.label}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text-3)" }}>{Math.round(category.weight * 100)}% weight</span>
                  <span style={{ fontSize: 13, fontWeight: 900, fontFamily: "var(--font-plex-mono)", color: "var(--green)" }}>{Math.round(category.score)}</span>
                </div>
              </div>
              <div className="vf-bar">
                <div className="vf-bar-fill" style={{ width: `${Math.round(category.score)}%` }} />
              </div>
            </FlatCard>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          <FlatCard style={{ flex: 1 }}>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={15} weight="fill" color="var(--green)" />
              <Eyebrow tone="green">Strongest</Eyebrow>
            </div>
            <p style={{ fontSize: 13, fontWeight: 800 }}>{summary.strongest.label}</p>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Score {Math.round(summary.strongest.score)}</p>
          </FlatCard>
          <FlatCard style={{ flex: 1 }}>
            <div className="flex items-center gap-2 mb-1">
              <Lightning size={15} weight="fill" color="var(--yellow)" />
              <Eyebrow tone="gold">Focus area</Eyebrow>
            </div>
            <p style={{ fontSize: 13, fontWeight: 800 }}>{summary.weakest.label}</p>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Score {Math.round(summary.weakest.score)}</p>
          </FlatCard>
        </div>

        <button
          type="button"
          onClick={onViewGaps}
          className={cn("vf-card-flat")}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, cursor: "pointer", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <ListMagnifyingGlass size={20} weight="bold" color="var(--text-2)" />
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 13, fontWeight: 800 }}>See full gap analysis</p>
              <p style={{ fontSize: 11, color: "var(--text-3)" }}>Every measured drill vs. freshman / JV / varsity targets</p>
            </div>
          </div>
          <ArrowRight size={16} weight="bold" color="var(--text-3)" />
        </button>

        <div className="flex flex-col gap-3">
          <Btn onClick={onGeneratePlan}>
            <Sparkle size={16} weight="fill" /> {isFirstRun ? "Build my training roadmap" : "Regenerate my roadmap"}
          </Btn>
          <Btn ghost onClick={onContinue}>
            {isFirstRun ? "Continue to home" : "Back"}
          </Btn>
        </div>
      </div>
    </>
  );
}
