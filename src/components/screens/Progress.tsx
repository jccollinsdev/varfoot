"use client";

// Progress page (was the old TrackScreen) — every bar now flows through scoring.ts via
// MetricBar, so a 40s cone slalom against a 10s varsity target reads as weak, not full.
// Radar uses the same five weighted Varsity Readiness categories as the Readiness screen
// (computeReadiness is the single source of truth — see src/lib/readiness.ts), and the
// drill list below it is segmented by training bucket and ranked weakest-first via gapSummary.

import { useMemo, useState } from "react";
import { CheckCircle, Circle, Medal } from "@phosphor-icons/react";

import { Eyebrow, FlatCard, MetricBar, Radar, TopBar, initialsOf } from "@/components/ui";
import type { DrillCategory } from "@/data/drillCatalog";
import { gapSummary, type GapItem, type ReadinessSummary } from "@/lib/readiness";
import { CATEGORY_BUCKET } from "@/lib/roadmap";
import { hasReachedVarsity } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { AssessmentState, DrillResult } from "@/lib/varfoot";

type FilterKey = "all" | "technical" | "physical" | "conditioning" | "recovery";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "technical", label: "Technical" },
  { key: "physical", label: "Physical" },
  { key: "conditioning", label: "Speed & stamina" },
  { key: "recovery", label: "Nutrition" },
];

function bucketOf(category: string): FilterKey {
  return CATEGORY_BUCKET[category as DrillCategory] ?? "technical";
}

function GapRow({ gap, onOpen }: { gap: GapItem; onOpen: (drillId: string) => void }) {
  const atVarsity = gap.measured && gap.currentValue != null && hasReachedVarsity(gap.currentValue, gap);
  return (
    <button
      type="button"
      onClick={() => onOpen(gap.drillId)}
      className="vf-card-flat"
      style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {atVarsity ? <CheckCircle size={15} weight="fill" color="var(--green)" /> : <Circle size={15} weight="bold" color="var(--text-3)" />}
          <Eyebrow>{gap.category}</Eyebrow>
        </div>
        {atVarsity && <span style={{ fontSize: 10, fontWeight: 900, color: "var(--green)", textTransform: "uppercase", letterSpacing: ".06em" }}>Varsity</span>}
      </div>
      <p style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{gap.name}</p>
      {gap.measured ? (
        <MetricBar
          label="Current"
          value={gap.currentValue}
          unit={` ${gap.unit}`}
          anchors={{ freshmanTarget: gap.freshmanTarget, jvTarget: gap.jvTarget, varsityTarget: gap.varsityTarget, scoreDirection: gap.scoreDirection }}
        />
      ) : (
        <p style={{ fontSize: 11, color: "var(--text-3)" }}>Not measured yet — log a result to see how you stack up.</p>
      )}
    </button>
  );
}

export function Progress({
  assessment,
  drillResults,
  summary,
  streak,
  onAvatarTap,
  onOpenDrill,
}: {
  assessment: AssessmentState;
  drillResults: Record<string, DrillResult>;
  summary: ReadinessSummary;
  streak: number;
  onAvatarTap: () => void;
  onOpenDrill: (drillId: string) => void;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const gaps = useMemo(() => gapSummary(assessment, drillResults), [assessment, drillResults]);
  const filtered = filter === "all" ? gaps : gaps.filter((g) => bucketOf(g.category) === filter);
  const personalBests = useMemo(
    () => gaps.filter((g) => g.measured && g.currentValue != null && hasReachedVarsity(g.currentValue, g)),
    [gaps],
  );

  // Exclude planReadiness from the radar — it's an administrative metric, not a soccer skill,
  // and "Plan" as a radar axis confuses players.
  const radarCategories = summary.categories.filter((c) => c.key !== "planReadiness");
  const axes = radarCategories.map((c) => c.label.split(" ")[0]);
  const you = radarCategories.map((c) => Math.round(c.score));
  const target = radarCategories.map(() => 100);

  return (
    <>
      <TopBar title="Progress" streak={streak} onAvatarTap={onAvatarTap} initials={initialsOf(assessment.name)} />
      <div className="content-area content-scroll" style={{ padding: "18px 18px 28px" }}>
        <FlatCard style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <Eyebrow>Five-category radar</Eyebrow>
          <div style={{ marginTop: 8 }}>
            <Radar you={you} tgt={target} axes={axes} size={190} />
          </div>
        </FlatCard>

        {personalBests.length > 0 && (
          <FlatCard style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-2 mb-2">
              <Medal size={16} weight="fill" color="var(--green)" />
              <Eyebrow tone="green">At varsity level ({personalBests.length})</Eyebrow>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {personalBests.map((g) => (
                <span key={g.drillId} className="vf-chip on">{g.name}</span>
              ))}
            </div>
          </FlatCard>
        )}

        <div className="vf-seg" style={{ marginBottom: 16, overflowX: "auto", flexShrink: 0 }}>
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className={cn("vf-seg-btn", filter === f.key && "on")} onClick={() => setFilter(f.key)} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((gap) => (
            <GapRow key={gap.drillId} gap={gap} onOpen={onOpenDrill} />
          ))}
          {filtered.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "24px 0" }}>Nothing in this category yet.</p>
          )}
        </div>
      </div>
    </>
  );
}


