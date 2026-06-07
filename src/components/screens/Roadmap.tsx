"use client";

// Duolingo-style training path — replaces the old flat week-list PlanScreen. Renders the
// generated RoadmapState (src/lib/roadmap.ts) as a vertical sequence of locked / current /
// completed nodes; tapping the current or a completed node opens its session detail.
// Regenerating only ever replaces future/locked nodes — completed history stays immutable.

import { Barbell, BowlFood, CalendarBlank, Check, CheckCircle, Lightning, Lock, Play, Sparkle, Target } from "@phosphor-icons/react";

import { BackBar, Btn, Card, Eyebrow, FlatCard } from "@/components/ui";
import { getDrill, type DrillCategory } from "@/data/drillCatalog";
import { CATEGORY_BUCKET } from "@/lib/roadmap";
import { teamLevelLabels, type AssessmentState, type DrillResult, type RoadmapNode, type RoadmapState } from "@/lib/varfoot";
import { cn } from "@/lib/utils";

const BUCKET_ICON: Record<"technical" | "physical" | "conditioning" | "recovery", typeof Target> = {
  technical: Target,
  physical: Barbell,
  conditioning: Lightning,
  recovery: BowlFood,
};

function NodeIcon({ category, status }: { category: string; status: RoadmapNode["status"] }) {
  if (status === "completed") return <Check size={20} weight="bold" />;
  if (status === "locked") return <Lock size={18} weight="bold" />;
  // RoadmapNode.focusCategory is stored as a plain string in the persisted JSONB shape,
  // but generateRoadmap always sets it from a real drill.category — fall back gracefully
  // if a future catalog change ever produces an unrecognized value.
  const bucket = CATEGORY_BUCKET[category as DrillCategory] ?? "technical";
  const Icon = BUCKET_ICON[bucket];
  return <Icon size={20} weight="bold" />;
}

function formatNodeDate(date: string | null) {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function NodeRow({ node, onOpen }: { node: RoadmapNode; onOpen: (node: RoadmapNode) => void }) {
  const drills = node.drillIds.map((id) => getDrill(id)).filter((d): d is NonNullable<typeof d> => Boolean(d));
  const interactive = node.status !== "locked";
  return (
    <button
      type="button"
      onClick={() => interactive && onOpen(node)}
      disabled={!interactive}
      style={{
        display: "flex", gap: 14, width: "100%", textAlign: "left", background: "none", border: "none",
        padding: "10px 0", cursor: interactive ? "pointer" : "default",
      }}
    >
      <div className={cn("vf-node-dot", node.status === "completed" && "done", node.status === "current" && "now", node.status === "locked" && "lock")}>
        <NodeIcon category={node.focusCategory} status={node.status} />
      </div>
      <div style={{ flex: 1, paddingTop: 4 }}>
        <div className="flex items-center gap-2 mb-1">
          <span style={{ fontSize: 14, fontWeight: 900, color: node.status === "locked" ? "var(--text-3)" : "var(--text)" }}>{node.label}</span>
          {node.status === "current" && <Eyebrow tone="green">Up next</Eyebrow>}
          {formatNodeDate(node.date) && (
            <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700 }}>· {formatNodeDate(node.date)}</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
          {node.focusCategory} focus · ~{node.estimatedMinutes} min
        </p>
        {node.status !== "locked" && drills.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {drills.map((d) => (
              <span key={d.id} className="vf-chip" style={{ padding: "4px 9px", fontSize: 11 }}>{d.name}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export function Roadmap({
  roadmap,
  assessment,
  summary,
  onBack,
  onOpenNode,
  onRegenerate,
}: {
  roadmap: RoadmapState;
  assessment: AssessmentState;
  summary?: string | null;
  onBack: () => void;
  onOpenNode: (node: RoadmapNode) => void;
  onRegenerate: () => void;
}) {
  if (roadmap.nodes.length === 0) {
    return (
      <>
        <BackBar title="Your Roadmap" onBack={onBack} />
        <div className="content-area content-scroll" style={{ padding: "24px 18px" }}>
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "32px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--green-ghost)", border: "1px solid var(--green-line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkle size={28} weight="fill" color="var(--green)" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>No roadmap yet</p>
              <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.55, maxWidth: 280 }}>
                Generate a training path built around your biggest gaps, your tryout date, and how often you can train.
              </p>
            </div>
            <Btn onClick={onRegenerate}>
              <Sparkle size={16} weight="fill" /> Generate my roadmap
            </Btn>
          </Card>
        </div>
      </>
    );
  }

  const completed = roadmap.nodes.filter((n) => n.status === "completed").length;

  return (
    <>
      <BackBar title="Your Roadmap" sub={`${completed}/${roadmap.nodes.length} sessions complete`} onBack={onBack} />
      <div className="content-area content-scroll" style={{ padding: "20px 18px 28px" }}>
        <FlatCard style={{ marginBottom: 16 }}>
          <div className="flex items-center gap-2 mb-1">
            <CalendarBlank size={15} weight="bold" color="var(--green)" />
            <Eyebrow tone="green">
              {roadmap.goalDate ? `Building toward ${roadmap.goalDate}` : "No tryout date set"}
            </Eyebrow>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
            {summary
              ? summary
              : `Targeting the ${teamLevelLabels[assessment.targetLevel]} squad with ${assessment.trainingDaysPerWeek} session${assessment.trainingDaysPerWeek === 1 ? "" : "s"} a week — sessions are ordered by your largest measured gaps.`}
          </p>
        </FlatCard>

        <div className="vf-divider" style={{ marginLeft: 26, marginBottom: 4 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {roadmap.nodes.map((node) => (
            <NodeRow key={node.id} node={node} onOpen={onOpenNode} />
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <Btn ghost onClick={onRegenerate}>
            <Sparkle size={15} weight="fill" /> Regenerate from here
          </Btn>
          <p style={{ fontSize: 10, color: "var(--text-3)", textAlign: "center", marginTop: 8, lineHeight: 1.4 }}>
            Completed sessions stay locked in — regenerating only rebuilds what&rsquo;s ahead of you.
          </p>
        </div>
      </div>
    </>
  );
}

export function RoadmapSession({
  node,
  drillResults,
  onBack,
  onOpenDrill,
}: {
  node: RoadmapNode;
  drillResults: Record<string, DrillResult>;
  onBack: () => void;
  onOpenDrill: (drillId: string) => void;
}) {
  const drills = node.drillIds.map((id) => getDrill(id)).filter((d): d is NonNullable<typeof d> => Boolean(d));
  const completedCount = node.drillIds.filter((id) => {
    const saved = drillResults[id];
    return Boolean(saved && (saved.skipped || saved.value != null));
  }).length;
  return (
    <>
      <BackBar title={node.label} sub={formatNodeDate(node.date) ?? undefined} onBack={onBack} />
      <div className="content-area content-scroll" style={{ padding: "20px 18px 28px" }}>
        <FlatCard style={{ marginBottom: 18 }}>
          <Eyebrow tone="green">{node.focusCategory} focus</Eyebrow>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6 }}>
            {drills.length} drill{drills.length === 1 ? "" : "s"} · ~{node.estimatedMinutes} min total
          </p>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
            {completedCount}/{node.drillIds.length} drill{node.drillIds.length === 1 ? "" : "s"} logged
          </p>
        </FlatCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {drills.map((drill, i) => {
            const logged = Boolean(drillResults[drill.id] && (drillResults[drill.id].skipped || drillResults[drill.id].value != null));
            return (
              <button
                key={drill.id}
                type="button"
                onClick={() => onOpenDrill(drill.id)}
                className="vf-card-flat"
                style={{ width: "100%", textAlign: "left", display: "flex", gap: 14, alignItems: "center", cursor: "pointer", border: "1px solid var(--border)" }}
              >
                <div className="vf-node-dot" style={{ width: 38, height: 38 }}>
                  <span style={{ fontSize: 14 }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <p style={{ fontSize: 13, fontWeight: 800 }}>{drill.name}</p>
                    {logged && <Eyebrow tone="green">Logged</Eyebrow>}
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>{drill.category} · ~{drill.estimatedMinutes} min · target {drill.varsityTarget} {drill.unit}</p>
                </div>
                {logged ? <CheckCircle size={18} weight="fill" color="var(--green)" /> : <Play size={16} weight="fill" color="var(--green)" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
