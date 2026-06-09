"use client";

// Full gap-analysis list — every onboarding-measured drill ranked weakest-first. Reached
// via "See full gap analysis" from Readiness. Drills are grouped into per-category
// accordions (weakest category first) so the player can scan category-level standing
// before drilling into individual results — a long flat list of 19+ cards was hard to
// scan. Reuses MetricBar so every bar is direction-aware (a 40s cone slalom against a
// 10s target reads as weak, not full) and skipped/unmeasured drills are shown honestly.

import { useState } from "react";
import { ArrowRight, CaretDown, Users } from "@phosphor-icons/react";

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

  // `gaps` arrives weakest-first, so the first category we encounter while walking the
  // list contains the single weakest drill — keep that ordering for the groups themselves.
  const categories: { name: string; items: GapItem[] }[] = [];
  for (const gap of measured) {
    let group = categories.find((c) => c.name === gap.category);
    if (!group) {
      group = { name: gap.category, items: [] };
      categories.push(group);
    }
    group.items.push(gap);
  }

  const [openCategory, setOpenCategory] = useState<string | null>(categories[0]?.name ?? null);

  return (
    <>
      <BackBar title="Gap Analysis" sub={`${atVarsity}/${measured.length} at varsity level`} onBack={onBack} />
      <div className="content-area content-scroll" style={{ padding: "16px 16px 24px" }}>
        <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.55, marginBottom: 16 }}>
          Every drill you measured, grouped by category — weakest category first, weakest drill
          first within it. Tap a category to expand it, then tap a drill for the full breakdown.
          Bars still fill in the direction that actually matters for that metric — a faster sprint
          time fills the bar; a slower one doesn&apos;t.
        </p>

        {categories.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: unmeasured.length > 0 ? 22 : 0 }}>
            {categories.map((group) => {
              const groupAtVarsity = group.items.filter((g) => g.currentValue != null && hasReachedVarsity(g.currentValue, g)).length;
              const isOpen = openCategory === group.name;
              return (
                <div key={group.name} className="vf-card-flat" style={{ padding: 0, overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setOpenCategory(isOpen ? null : group.name)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  >
                    <div>
                      <Eyebrow>{group.name}</Eyebrow>
                      <p style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>
                        {groupAtVarsity}/{group.items.length} at varsity level
                      </p>
                    </div>
                    <CaretDown
                      size={16}
                      weight="bold"
                      color="var(--text-3)"
                      style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease", flexShrink: 0 }}
                    />
                  </button>
                  {isOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 12px 12px" }}>
                      {group.items.map((gap) => (
                        <button
                          key={gap.drillId}
                          type="button"
                          onClick={() => onOpenDrill(gap.drillId)}
                          className="vf-card-flat"
                          style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p style={{ fontSize: 14, fontWeight: 800 }}>{gap.name}</p>
                            <ArrowRight size={14} weight="bold" color="var(--text-3)" />
                          </div>
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
                </div>
              );
            })}
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
                      <p style={{ fontSize: 11, color: "var(--text-3)" }}>Skipped during assessment — log it when you&apos;re ready.</p>
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
