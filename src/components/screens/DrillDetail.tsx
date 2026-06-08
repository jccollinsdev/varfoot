"use client";

// Drill detail / logging — pulls every field straight from drillCatalog (diagram,
// setup/action/measurement, equipment) and renders the input control
// matched to the drill's `inputType` via the shared DrillCapture (ui.tsx). Saving writes
// into AppState.drillResults (and, when reached from a roadmap session, completes that
// node) — both paths persist through the existing autosave → varfoot-sync → Supabase chain.

import { useState } from "react";
import Image from "next/image";
import { BookmarkSimple, Check, Clock, ShieldWarning, Users } from "@phosphor-icons/react";

import { BackBar, Btn, DrillCapture, Eyebrow, FlatCard, MetricBar, type DrillDraft } from "@/components/ui";
import type { Drill } from "@/data/drillCatalog";
import type { DrillResult } from "@/lib/varfoot";
import { cn } from "@/lib/utils";

export function DrillDetail({
  drill,
  previousResult,
  isSaved,
  sessionProgress,
  onBack,
  onSave,
  onToggleSaved,
}: {
  drill: Drill;
  previousResult: DrillResult | undefined;
  isSaved: boolean;
  sessionProgress?: {
    completedCount: number;
    totalCount: number;
    willCompleteOnSave: boolean;
  } | null;
  onBack: () => void;
  onSave: (result: { value: number | null; skipped: boolean }) => void;
  onToggleSaved: () => void;
}) {
  const [draft, setDraft] = useState<DrillDraft | undefined>(
    previousResult ? { value: previousResult.value, skipped: Boolean(previousResult.skipped) } : undefined,
  );
  const [justSaved, setJustSaved] = useState(false);

  const canSave = draft != null && (draft.skipped || draft.value != null);

  const handleSave = () => {
    if (!draft) return;
    onSave({ value: draft.skipped ? null : draft.value, skipped: draft.skipped });
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1800);
  };

  return (
    <>
      <BackBar
        title={drill.name}
        sub={drill.category}
        onBack={onBack}
        action={
          <button
            type="button"
            onClick={onToggleSaved}
            aria-label={isSaved ? "Remove from library" : "Save to library"}
            style={{ background: "none", border: "none", cursor: "pointer", color: isSaved ? "var(--green)" : "var(--text-3)" }}
          >
            <BookmarkSimple size={20} weight={isSaved ? "fill" : "bold"} />
          </button>
        }
      />
      <div className="content-area content-scroll" style={{ padding: "20px 18px 28px" }}>
        <div className="vf-card-flat" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <Image src={drill.imagePath} alt={drill.name} width={400} height={240} style={{ width: "100%", height: "auto", display: "block" }} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <span className="vf-chip" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} weight="bold" /> ~{drill.estimatedMinutes} min
          </span>
          {drill.equipment.map((item) => (
            <span key={item} className="vf-chip">{item}</span>
          ))}
          {drill.requiresPartner && (
            <span className="vf-chip" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={13} weight="bold" /> Needs a partner
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          <InfoRow label="Setup" text={drill.setup} />
          <InfoRow label="Action" text={drill.action} />
          <InfoRow label="Measurement" text={drill.measurement} />
          {drill.instructions && <InfoRow label="Coaching cue" text={drill.instructions} />}
        </div>

        {drill.requiresPartner && drill.safetyNotes && (
          <div className="vf-card-flat" style={{ borderColor: "var(--yellow)", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18 }}>
            <ShieldWarning size={18} weight="fill" color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 900, color: "var(--yellow)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
                Read before you start
              </p>
              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>{drill.safetyNotes}</p>
            </div>
          </div>
        )}

        {previousResult && !previousResult.skipped && previousResult.value != null && (
          <FlatCard style={{ marginBottom: 18 }}>
            <Eyebrow className="mb-2">Last logged result</Eyebrow>
            <MetricBar
              label="Most recent"
              value={previousResult.value}
              unit={` ${drill.unit}`}
              anchors={{ freshmanTarget: drill.freshmanTarget, jvTarget: drill.jvTarget, varsityTarget: drill.varsityTarget, scoreDirection: drill.scoreDirection }}
            />
          </FlatCard>
        )}

        {sessionProgress && (
          <FlatCard style={{ marginBottom: 18 }}>
            <Eyebrow tone="green" className="mb-2">Session progress</Eyebrow>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
              {sessionProgress.completedCount}/{sessionProgress.totalCount} drill{sessionProgress.totalCount === 1 ? "" : "s"} logged for this roadmap session.
            </p>
          </FlatCard>
        )}

        <div className="vf-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 18 }}>
          {draft?.skipped ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text-2)" }}>Marked as skipped</p>
              <button
                type="button"
                onClick={() => setDraft({ value: null, skipped: false })}
                style={{ marginTop: 10, background: "none", border: "none", color: "var(--green)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}
              >
                Undo — log a result now
              </button>
            </div>
          ) : (
            <DrillCapture drill={drill} draft={draft} onChange={(value, skipped) => setDraft({ value, skipped })} />
          )}
        </div>

        {!draft?.skipped && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setDraft({ value: null, skipped: true })}
              style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
            >
              Mark as skipped for now
            </button>
          </div>
        )}
      </div>

      <div className="vf-footer">
        <Btn className={cn("w-full", justSaved && "opacity-90")} onClick={handleSave} disabled={!canSave}>
          {justSaved ? (
            <>Saved <Check size={16} weight="bold" /></>
          ) : sessionProgress?.willCompleteOnSave ? (
            "Save & complete session"
          ) : (
            "Save result"
          )}
        </Btn>
      </div>
    </>
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
