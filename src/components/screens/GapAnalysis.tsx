"use client";

// Full gap-analysis list — every onboarding-measured drill vs. its freshman/JV/varsity
// targets, weakest-first. Reached via "See full gap analysis" from Readiness. Reuses
// MetricBar so every bar is direction-aware (a 40s cone slalom against a 10s target reads
// as weak, not full) and skipped/unmeasured drills are shown honestly rather than as zero.

import { ArrowRight, Users } from "@phosphor-icons/react";

import { BackBar, Eyebrow, MetricBar } from "@/components/ui";
import { hasReachedVarsity } from "@/lib/scoring";
import type { GapItem } from "@/lib/readiness";

export function GapAnalysis({
  gaps,
  onBack,
  onOpenDrill,
}: {
  gaps: GapItem[];
  onBack: () => void;
  onOpenDrill: (drillId: string) => void;
}) {
  const measured = gaps.filter((g) => g.measured);
  const unmeasured = gaps.filter((g) => !g.measured);
  const atVarsity = measured.filter((g) => g.currentValue != null && hasReachedVarsity(g.currentValue, g)).length;

  return (
    <>
      <BackBar title="Gap Analysis" sub={`${atVarsity}/${measured.length} at varsity level`} onBack={onBack} />
      <div className="content-area content-scroll" style={{ padding: "20px 18px 28px" }}>
        <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.55, marginBottom: 16 }}>
          Every drill you measured, ranked weakest-first against the real freshman / JV / varsity targets from the
          assessment. Bars fill toward varsity in the direction that actually matters for that metric — a faster
          sprint time fills the bar; a slower one doesn&apos;t.
        </p>

        {measured.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: unmeasured.length > 0 ? 22 : 0 }}>
            {measured.map((gap) => (
              <button
                key={gap.drillId}
                type="button"
                onClick={() => onOpenDrill(gap.drillId)}
                className="vf-card-flat"
                style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <Eyebrow>{gap.category}</Eyebrow>
                  <ArrowRight size={14} weight="bold" color="var(--text-3)" />
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{gap.name}</p>
                <MetricBar
                  label="Your result"
                  value={gap.currentValue}
                  unit={` ${gap.unit}`}
                  anchors={{ freshmanTarget: gap.freshmanTarget, jvTarget: gap.jvTarget, varsityTarget: gap.varsityTarget, scoreDirection: gap.scoreDirection }}
                />
              </button>
            ))}
          </div>
        )}

        {unmeasured.length > 0 && (
          <div>
            <Eyebrow tone="gold" className="mb-2">Not measured yet</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {unmeasured.map((gap) => (
                <button
                  key={gap.drillId}
                  type="button"
                  onClick={() => onOpenDrill(gap.drillId)}
                  className="vf-card-flat"
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", border: "1px dashed var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <Users size={16} weight="bold" color="var(--text-3)" />
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: 13, fontWeight: 800 }}>{gap.name}</p>
                      <p style={{ fontSize: 11, color: "var(--text-3)" }}>Skipped during assessment — varsity target {gap.varsityTarget} {gap.unit}</p>
                    </div>
                  </div>
                  <ArrowRight size={14} weight="bold" color="var(--text-3)" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
