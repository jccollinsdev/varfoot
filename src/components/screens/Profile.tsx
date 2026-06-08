"use client";

// Avatar bottom-sheet — ported from the legacy ProfileSheet onto the new AppState shape
// (assessment.name/position). Same actions: load demo athlete, reset all data,
// sign out (cloud mode only), close. Sync-state label map kept verbatim.

import type { AppState } from "@/lib/varfoot";

const SYNC_LABELS: Record<string, string> = {
  local: "Local only",
  guest: "Local only",
  demo: "Demo mode",
  loading: "Loading…",
  saving: "Saving…",
  synced: "Cloud synced",
  error: "Sync error",
  "signed-out": "Signed out",
};

export function Profile({
  state,
  localMode,
  syncState,
  onSignOut,
  onLoadDemo,
  onReset,
  onClose,
}: {
  state: AppState;
  localMode: boolean;
  syncState: string;
  onSignOut: () => Promise<void>;
  onLoadDemo: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const initials = (state.assessment.name || "VA").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "VA";

  return (
    <div
      style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "28px 28px 0 0", border: "1px solid var(--border-soft)", background: "rgba(10,10,11,.98)", paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: "rgba(245,245,246,.18)" }} />
        </div>
        <div style={{ padding: "12px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--elev)", border: "1px solid var(--green-line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "var(--text)", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-.04em" }}>{state.assessment.name || "Athlete"}</p>
              <p style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {state.assessment.position || "—"}
              </p>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--text-3)", marginTop: 2 }}>
                {SYNC_LABELS[syncState] ?? syncState}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" className="vf-btn" onClick={onLoadDemo}>Load demo athlete</button>
            <button type="button" className="vf-btn-ghost" onClick={onReset}>Reset all data</button>
            {!localMode && (
              <button
                type="button"
                onClick={() => void onSignOut()}
                style={{ height: 46, borderRadius: "var(--r-sm)", border: "1px solid rgba(255,107,94,.26)", background: "rgba(255,107,94,.08)", color: "var(--red)", fontWeight: 900, fontSize: 14, cursor: "pointer" }}
              >
                Sign out
              </button>
            )}
            <button type="button" onClick={onClose} style={{ height: 40, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--text-3)" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
