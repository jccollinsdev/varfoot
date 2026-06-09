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
import type { AssessmentState, DrillResult, ProgressSnapshot } from "@/lib/varfoot";

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

/** SVG sparkline showing the player's overall readiness score over completed sessions.
 * Renders a JV/freshman reference line when those thresholds fall within the visible range.
 * Returns null when fewer than 2 snapshots exist (nothing to trend). */
function Sparkline({ history }: { history: ProgressSnapshot[] }) {
  const pts = history.slice(-12); // cap at 12 most-recent sessions for readability
  if (pts.length < 2) return null;

  const W = 260, H = 72;
  const PL = 24, PR = 8, PT = 8, PB = 20;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;

  const scores = pts.map((s) => s.overall);
  const yMin = Math.max(0, Math.min(...scores) - 8);
  const yMax = Math.min(100, Math.max(...scores) + 8);
  const yRange = yMax - yMin || 1;

  const toX = (i: number) => PL + (i / (pts.length - 1)) * plotW;
  const toY = (s: number) => PT + plotH - ((s - yMin) / yRange) * plotH;

  const polyPts = pts.map((p, i) => `${toX(i)},${toY(p.overall)}`).join(" ");
  const areaPath = [
    `M ${toX(0)},${toY(pts[0].overall)}`,
    ...pts.map((p, i) => `L ${toX(i)},${toY(p.overall)}`),
    `L ${toX(pts.length - 1)},${PT + plotH}`,
    `L ${PL},${PT + plotH}`,
    "Z",
  ].join(" ");

  const first = pts[0].overall;
  const last = pts[pts.length - 1].overall;
  const delta = Math.round(last - first);
  const trendLabel = delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : "Steady";
  const trendColor = delta > 0 ? "var(--green)" : delta < 0 ? "var(--red)" : "var(--text-3)";

  // Reference lines for benchmarks that fall inside the visible y-range
  const refs: Array<{ score: number; label: string }> = [];
  if (70 >= yMin && 70 <= yMax) refs.push({ score: 70, label: "JV" });
  if (40 >= yMin && 40 <= yMax) refs.push({ score: 40, label: "Fr" });

  return (
    <FlatCard style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <Eyebrow>Score history</Eyebrow>
        <span style={{ fontSize: 11, fontWeight: 900, color: trendColor }}>
          {trendLabel} · {pts.length} session{pts.length === 1 ? "" : "s"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
        aria-label={`Readiness score history: started at ${Math.round(first)}, now at ${Math.round(last)}`}
      >
        {/* Benchmark reference lines */}
        {refs.map((r) => {
          const ry = toY(r.score);
          return (
            <g key={r.score}>
              <line x1={PL} y1={ry} x2={W - PR} y2={ry} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
              <text x={PL - 3} y={ry + 3.5} fontSize={8} fill="var(--text-3)" textAnchor="end" fontFamily="var(--font-plex-mono)">{r.label}</text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={areaPath} fill="var(--green)" fillOpacity={0.07} />
        {/* Line */}
        <polyline points={polyPts} fill="none" stroke="var(--green)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.overall)} r={2.5} fill="var(--green)" />
        ))}
        {/* Score labels: first (muted) and last (green, bold) */}
        <text x={toX(0)} y={H - 5} fontSize={8} fill="var(--text-3)" textAnchor="middle" fontFamily="var(--font-plex-mono)">
          {Math.round(first)}
        </text>
        <text x={toX(pts.length - 1)} y={H - 5} fontSize={8} fill="var(--green)" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-plex-mono)">
          {Math.round(last)}
        </text>
      </svg>
    </FlatCard>
  );
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
  history,
  streak,
  onAvatarTap,
  onOpenDrill,
}: {
  assessment: AssessmentState;
  drillResults: Record<string, DrillResult>;
  summary: ReadinessSummary;
  history: ProgressSnapshot[];
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
      <div className="content-area content-scroll" style={{ padding: "16px 16px 24px" }}>
        <Sparkline history={history} />

        <FlatCard style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <Eyebrow>Skills radar</Eyebrow>
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

        <div className="vf-seg" style={{ marginBottom: 16, overflowX: "auto", flexShrink: 0, maxWidth: "100%", touchAction: "pan-x" }}>
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


