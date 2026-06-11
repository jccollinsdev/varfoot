"use client";

// AI Coach chat — wired to the rewritten /api/coach (real player context via
// buildCoachContext + askGemini's explicit GeminiResult, see src/lib/gemini.ts &
// coachContext.ts). On failure this shows the real error and a Retry button — never
// silent fallback copy. `status`/`messages`/`draft` persist in AppState.coach; the
// error string is transient UI state owned by the App shell (not worth persisting).

import { useEffect, useRef } from "react";
import { ArrowClockwise, PaperPlaneTilt, Robot, WarningCircle } from "@phosphor-icons/react";

import { Eyebrow, TopBar } from "@/components/ui";
import type { CoachMessage, CoachStatus } from "@/lib/varfoot";

const QUICK_PROMPTS = [
  "What should I work on first?",
  "How am I tracking toward varsity?",
  "Give me today's session focus",
  "What's my biggest gap right now?",
];

function MessageBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      {!isUser && (
        <div className="vf-ico" style={{ marginRight: 8, width: 30, height: 30 }}>
          <Robot size={15} weight="bold" color="var(--green)" />
        </div>
      )}
      <div className={isUser ? "vf-bubble-out" : "vf-bubble-in"}>
        {message.text.split(/\n+/).map((line, i) => (
          <p key={i} style={{ marginTop: i === 0 ? 0 : 6 }}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div className="vf-ico" style={{ width: 30, height: 30 }}>
        <Robot size={15} weight="bold" color="var(--green)" />
      </div>
      <div className="vf-bubble-in" style={{ display: "flex", gap: 6, alignItems: "center", padding: "13px 16px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="bounce-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-3)" }} />
        ))}
      </div>
    </div>
  );
}

export function Coach({
  messages,
  draft,
  status,
  streamingText,
  error,
  streak,
  initials,
  onAvatarTap,
  onDraftChange,
  onSend,
  onRetry,
}: {
  messages: CoachMessage[];
  draft: string;
  status: CoachStatus;
  /** Partial text accumulating while Gemini streams — shown live instead of just a spinner. */
  streamingText: string;
  /** The real Gemini/network failure message — surfaced verbatim, never replaced with fake copy. */
  error: string | null;
  streak: number;
  initials: string;
  onAvatarTap: () => void;
  onDraftChange: (text: string) => void;
  onSend: (prompt: string) => void;
  onRetry: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || status === "loading") return;
    onSend(trimmed);
  };

  return (
    <>
      <TopBar title="Coach" streak={streak} onAvatarTap={onAvatarTap} initials={initials} />
      <div ref={scrollRef} className="content-area content-scroll" style={{ padding: "18px 16px 12px", display: "flex", flexDirection: "column" }}>
        {messages.length === 0 && status !== "loading" && (
          <div style={{ textAlign: "center", padding: "28px 12px" }}>
            <div className="vf-ico lg" style={{ margin: "0 auto 14px" }}>
              <Robot size={22} weight="bold" color="var(--green)" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>Ask your coach anything</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.55, maxWidth: 280, margin: "0 auto" }}>
              Every answer is grounded in your actual readiness score, gaps, roadmap, and nutrition log — nothing generic.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {status === "loading" && !streamingText && <TypingIndicator />}
        {status === "loading" && streamingText && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
            <div className="vf-ico" style={{ marginRight: 8, width: 30, height: 30 }}>
              <Robot size={15} weight="bold" color="var(--green)" />
            </div>
            <div className="vf-bubble-in" style={{ maxWidth: "84%" }}>
              {streamingText.split(/\n+/).filter(Boolean).map((line, i) => (
                <p key={i} style={{ marginTop: i === 0 ? 0 : 6 }}>{line}</p>
              ))}
              <span style={{ display: "inline-block", width: 6, height: 12, background: "var(--green)", marginLeft: 2, borderRadius: 1, animation: "blink 1s step-end infinite", verticalAlign: "middle" }} />
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="vf-bubble-in" style={{ borderColor: "var(--red)", display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "92%" }}>
            <WarningCircle size={17} weight="fill" color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>{error ?? "The coach couldn't respond."}</p>
              <button
                type="button"
                onClick={onRetry}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--green)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}
              >
                <ArrowClockwise size={14} weight="bold" /> Retry
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="vf-footer" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div className="vf-scroll-x" style={{ display: "flex", gap: 8, paddingBottom: 2, maxWidth: "100%", touchAction: "pan-x" }}>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSend(prompt)}
                className="vf-chip"
                style={{ whiteSpace: "nowrap", cursor: "pointer" }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              className="vf-input"
              style={{ width: "100%", paddingRight: draft.length > 400 ? 36 : undefined }}
              aria-label="Ask the coach"
              placeholder="Ask about your gaps, plan, or nutrition…"
              value={draft}
              maxLength={480}
              onChange={(e) => onDraftChange(e.target.value)}
              disabled={status === "loading"}
            />
            {draft.length > 400 && (
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontWeight: 800, color: draft.length > 450 ? "var(--red)" : "var(--text-3)", fontFamily: "var(--font-plex-mono)", pointerEvents: "none" }}>
                {480 - draft.length}
              </span>
            )}
          </div>
          <button
            type="submit"
            className="vf-stepper-btn"
            aria-label="Send"
            disabled={status === "loading" || draft.trim().length === 0}
            style={{ width: 50, height: 50, background: "var(--green)", color: "var(--green-ink)", border: "none", opacity: status === "loading" || draft.trim().length === 0 ? 0.5 : 1, flexShrink: 0 }}
          >
            <PaperPlaneTilt size={18} weight="fill" />
          </button>
        </form>
        {messages.length > 0 && status !== "error" && (
          <Eyebrow className="text-center">Grounded in your readiness, gaps, roadmap & nutrition — nothing generic</Eyebrow>
        )}
      </div>
    </>
  );
}
