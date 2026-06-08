"use client";

// Home / "Today" screen — the locked-design landing surface (per product decision: keep
// the existing home layout, only change what data feeds it). Pulls the day's roadmap
// session, the live Varsity Readiness composite, and the player's current top gap —
// all from the same readiness.ts/roadmap.ts pipeline every other screen uses.

import { ArrowRight, CalendarBlank, HandWaving, Lightning, ListMagnifyingGlass, Play, Sparkle } from "@phosphor-icons/react";

import { Eyebrow, FlatCard, Ring, TopBar } from "@/components/ui";
import { getDrill } from "@/data/drillCatalog";
import { readinessLevelLabels } from "@/lib/scoring";
import type { GapItem, ReadinessSummary } from "@/lib/readiness";
import type { AssessmentState, RoadmapNode, RoadmapState } from "@/lib/varfoot";

function greetingFor(name: string) {
  const first = name.trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return first ? `Good ${part}, ${first}` : `Good ${part}`;
}

function currentNode(roadmap: RoadmapState): RoadmapNode | null {
  return roadmap.nodes.find((n) => n.status === "current") ?? null;
}

function sessionLabel(node: RoadmapNode | null) {
  if (!node?.date) return "Up next";
  return node.date === new Date().toISOString().slice(0, 10) ? "Today’s session" : "Up next";
}

export function Today({
  assessment,
  summary,
  roadmap,
  topGap,
  streak,
  coachNote,
  onAvatarTap,
  onOpenSession,
  onOpenReadiness,
  onOpenGapAnalysis,
  onGeneratePlan,
  onOpenCoach,
}: {
  assessment: AssessmentState;
  summary: ReadinessSummary;
  roadmap: RoadmapState;
  topGap: GapItem | null;
  streak: number;
  coachNote: string | null;
  onAvatarTap: () => void;
  onOpenSession: (node: RoadmapNode) => void;
  onOpenReadiness: () => void;
  onOpenGapAnalysis: () => void;
  onGeneratePlan: () => void;
  onOpenCoach: () => void;
}) {
  const node = currentNode(roadmap);
  const sessionDrills = node ? node.drillIds.map((id) => getDrill(id)).filter((d): d is NonNullable<typeof d> => Boolean(d)) : [];

  return (
    <>
      <TopBar title="VarFoot" streak={streak} onAvatarTap={onAvatarTap} />
      <div className="content-area content-scroll" style={{ padding: "18px 18px 28px" }}>
        <div className="flex items-center gap-2 mb-4">
          <HandWaving size={18} weight="fill" color="var(--yellow)" />
          <h1 style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-.02em" }}>{greetingFor(assessment.name)}</h1>
        </div>

        {node ? (
          <button type="button" onClick={() => onOpenSession(node)} className="vf-card-hi" style={{ width: "100%", textAlign: "left", display: "block", cursor: "pointer", marginBottom: 16 }}>
            <div className="flex items-center justify-between mb-2">
              <Eyebrow tone="green">{sessionLabel(node)} · {node.label}</Eyebrow>
              <Play size={18} weight="fill" color="var(--green)" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>{node.focusCategory} focus</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
              {sessionDrills.length} drill{sessionDrills.length === 1 ? "" : "s"} · ~{node.estimatedMinutes} min
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {sessionDrills.map((d) => (
                <span key={d.id} className="vf-chip on" style={{ padding: "4px 9px", fontSize: 11 }}>{d.name}</span>
              ))}
            </div>
          </button>
        ) : (
          <button type="button" onClick={onGeneratePlan} className="vf-card-hi" style={{ width: "100%", textAlign: "left", display: "block", cursor: "pointer", marginBottom: 16 }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkle size={18} weight="fill" color="var(--green)" />
              <Eyebrow tone="green">No roadmap yet</Eyebrow>
            </div>
            <p style={{ fontSize: 15, fontWeight: 900, marginBottom: 4 }}>Build your training roadmap</p>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>We&rsquo;ll prioritize sessions around your biggest measured gaps.</p>
          </button>
        )}

        <button type="button" onClick={onOpenReadiness} className="vf-card-flat" style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", border: "1px solid var(--border)", marginBottom: 16 }}>
          <Ring size={64} pct={summary.overall / 100} sw={6}>
            <span style={{ fontSize: 17, fontWeight: 900, fontFamily: "var(--font-plex-mono)" }}>{Math.round(summary.overall)}</span>
          </Ring>
          <div style={{ flex: 1, textAlign: "left" }}>
            <Eyebrow>Varsity Readiness</Eyebrow>
            <p style={{ fontSize: 14, fontWeight: 800 }}>{readinessLevelLabels[summary.level]}</p>
            <p style={{ fontSize: 11, color: "var(--text-3)" }}>Strongest: {summary.strongest.label} · Focus: {summary.weakest.label}</p>
          </div>
          <ArrowRight size={16} weight="bold" color="var(--text-3)" />
        </button>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {summary.categories.slice(0, 3).map((category) => (
            <FlatCard key={category.key} style={{ flex: 1, textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 900, fontFamily: "var(--font-plex-mono)", color: "var(--green)" }}>{Math.round(category.score)}</p>
              <p style={{ fontSize: 10, fontWeight: 800, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".05em", marginTop: 2 }}>{category.label}</p>
            </FlatCard>
          ))}
        </div>

        {topGap && (
          <button type="button" onClick={onOpenGapAnalysis} className="vf-card-flat" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", border: "1px solid var(--border)", marginBottom: 16 }}>
            <div className="flex items-center gap-3">
              <Lightning size={18} weight="fill" color="var(--yellow)" />
              <div>
                <Eyebrow tone="gold">Biggest gap right now</Eyebrow>
                <p style={{ fontSize: 13, fontWeight: 800 }}>{topGap.name}</p>
                <p style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {topGap.measured ? `${topGap.currentValue} ${topGap.unit} recorded most recently` : "Not measured yet"}
                </p>
              </div>
            </div>
            <ListMagnifyingGlass size={16} weight="bold" color="var(--text-3)" />
          </button>
        )}

        <button type="button" onClick={onOpenCoach} className="vf-card-flat" style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", border: "1px solid var(--border)" }}>
          <div className="vf-ico"><CalendarBlank size={17} weight="bold" color="var(--green)" /></div>
          <div style={{ flex: 1 }}>
            <Eyebrow tone="green">Coach note</Eyebrow>
            <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.45, marginTop: 2 }}>
              {coachNote ?? "Ask your coach what to prioritize before your next session."}
            </p>
          </div>
          <ArrowRight size={15} weight="bold" color="var(--text-3)" />
        </button>
      </div>
    </>
  );
}
