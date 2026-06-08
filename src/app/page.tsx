"use client";

// VarFoot App shell — owns navigation (stack + bottom-nav), auth/session lifecycle,
// Supabase bootstrap + autosave, and every action handler that mutates AppState.
// Screens (src/components/screens/*) render only their own app-bar/content/footer;
// this shell supplies the outer phone-shell/phone-column frame, the bottom nav, and
// the profile sheet overlay — see the per-screen files for that convention's rationale.

import {
  useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore,
} from "react";
import {
  BowlFood, CalendarBlank, ChatsCircle, House, Target, X,
} from "@phosphor-icons/react";
import type { Session } from "@supabase/supabase-js";

import { LoadingScreen, NAV_TAB_LABELS, type RootTab } from "@/components/ui";
import { Auth } from "@/components/screens/Auth";
import { Coach } from "@/components/screens/Coach";
import { DrillDetail } from "@/components/screens/DrillDetail";
import { GapAnalysis } from "@/components/screens/GapAnalysis";
import { MealBuilder } from "@/components/screens/MealBuilder";
import { Nutrition } from "@/components/screens/Nutrition";
import { Onboarding } from "@/components/screens/Onboarding";
import { Profile } from "@/components/screens/Profile";
import { Progress } from "@/components/screens/Progress";
import { Readiness } from "@/components/screens/Readiness";
import { Roadmap, RoadmapSession } from "@/components/screens/Roadmap";
import { Today } from "@/components/screens/Today";
import { drillCatalog, getDrill } from "@/data/drillCatalog";
import { computeReadiness, gapSummary } from "@/lib/readiness";
import { completeRoadmapNode, generateRoadmap } from "@/lib/roadmap";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import { loadRemoteState, upsertRemoteProfile, upsertRemoteState } from "@/lib/varfoot-sync";
import {
  clearGuestMode, clearState, createBlankState, loadGuestMode, loadState, makeId, saveGuestMode, saveState,
  type AppState, type AssessmentState, type CoachMessage, type DrillResult,
  type Meal, type RoadmapState,
} from "@/lib/varfoot";

// ─── Navigation ───────────────────────────────────────────────────────────────

type Screen =
  | { id: "today" }
  | { id: "plan" }
  | { id: "train" }
  | { id: "fuel" }
  | { id: "coach" }
  | { id: "readiness"; firstRun: boolean }
  | { id: "gapAnalysis" }
  | { id: "roadmapSession"; nodeId: string }
  | { id: "drillDetail"; drillId: string; sessionNodeId?: string }
  | { id: "mealBuilder" };

const ROOT_SCREEN_IDS = new Set<Screen["id"]>(["today", "plan", "train", "fuel", "coach"]);

function isRootScreen(screen: Screen): screen is { id: RootTab } {
  return ROOT_SCREEN_IDS.has(screen.id);
}

const AUTH_TIMEOUT_MS = 6000;
const REMOTE_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

// ─── Demo persona ─────────────────────────────────────────────────────────────
// "Load demo athlete" is an explicit, on-demand product feature (a fictional persona for
// exploring the app without onboarding) — distinct from the silently-seeded fake nutrition
// data that was removed elsewhere. Drill values are anchored to each drill's real JV target
// so the readiness/roadmap/progress pipeline produces a coherent "JV player chasing varsity"
// picture; nutrition starts empty like every other account.

function isoDateDaysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function createDemoState(): AppState {
  const assessment: AssessmentState = {
    name: "Jordan Reyes",
    age: "16",
    school: "Lincoln High",
    position: "Midfielder",
    heightInches: 68,
    weightLbs: 145,
    availableDays: [1, 2, 4, 6],
    currentLevel: "jv",
    targetLevel: "varsity",
    tryoutDate: isoDateDaysFromNow(35),
    trainingDaysPerWeek: 4,
    goalFocus: "Improve first-step quickness and hold up better through contact",
  };
  const recordedAt = new Date().toISOString();
  const drillResults: Record<string, DrillResult> = Object.fromEntries(
    drillCatalog.map((drill) => [drill.id, { drillId: drill.id, value: drill.jvTarget, recordedAt, skipped: false }]),
  );
  const roadmap = generateRoadmap({ assessment, drillResults });
  return { ...createBlankState(), onboardingComplete: true, assessment, drillResults, roadmap };
}

/** Consecutive completed roadmap sessions counted from the start of the path — a real,
 * derivable measure of "days you've shown up in a row," not a fabricated counter. */
function computeStreak(roadmap: RoadmapState): number {
  let streak = 0;
  for (const node of roadmap.nodes) {
    if (node.status !== "completed") break;
    streak += 1;
  }
  return streak;
}

const NAV_TABS: Array<{ id: RootTab; Icon: React.ComponentType<{ size: number; weight: string; color: string }> }> = [
  { id: "today", Icon: House as never },
  { id: "plan", Icon: CalendarBlank as never },
  { id: "train", Icon: Target as never },
  { id: "fuel", Icon: BowlFood as never },
  { id: "coach", Icon: ChatsCircle as never },
];

function BottomNav({ active, onSelect }: { active: RootTab; onSelect: (t: RootTab) => void }) {
  return (
    <div className="bottom-nav">
      {NAV_TABS.map(({ id, Icon }) => {
        const on = id === active;
        return (
          <button key={id} type="button" className="nav-item" onClick={() => onSelect(id)}>
            <Icon size={22} weight={on ? "fill" : "regular"} color={on ? "var(--green)" : "var(--text-3)"} />
            <span className="nav-label" style={{ color: on ? "var(--green)" : "var(--text-3)" }}>{NAV_TAB_LABELS[id]}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const localMode = !hasSupabaseEnv();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [state, setState] = useState<AppState>(() => loadState());
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(!localMode);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [syncState, setSyncState] = useState(localMode ? "local" : "signed-out");
  const [authError, setAuthError] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(() => localMode || loadGuestMode());
  const [demoMode, setDemoMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [lastCoachPrompt, setLastCoachPrompt] = useState<string | null>(null);

  const [stack, setStack] = useState<Screen[]>(() => [{ id: state.activeTab }]);
  const [rootTab, setRootTab] = useState<RootTab>(() => state.activeTab);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const current = stack[stack.length - 1];

  const go = useCallback((s: Screen) => { setStack((prev) => [...prev, s]); }, []);
  const back = useCallback(() => { setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)); }, []);
  const goTab = useCallback((tab: RootTab) => {
    setRootTab(tab);
    setStack([{ id: tab }]);
    setState((prev) => (prev.activeTab === tab ? prev : { ...prev, activeTab: tab }));
  }, []);

  function patchState(updater: (prev: AppState) => AppState) { setState(updater); }

  // Auth listener
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS, "Supabase auth check timed out.")
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (data.session) {
          setGuestMode(false);
          clearGuestMode();
        }
        if (!data.session) { setBootstrapLoading(false); setSyncState("signed-out"); }
      })
      .catch((err) => {
        if (!active) return;
        setSession(null);
        setBootstrapLoading(false);
        setSyncState("signed-out");
        setAuthError(err instanceof Error ? err.message : "Unable to reach Supabase.");
      })
      .finally(() => { if (active) setAuthLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, next) => {
      if (!active) return;
      setSession(next); setAuthLoading(false); setAuthError(null);
      if (next) {
        setGuestMode(false);
        clearGuestMode();
      }
      if (!next) { setBootstrapLoading(false); setSyncState("signed-out"); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  // Bootstrap remote state
  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase, s = session;
    let cancelled = false;
    void (async () => {
      setBootstrapLoading(true); setSyncState("loading");
      try {
        await withTimeout(upsertRemoteProfile(client, s), REMOTE_TIMEOUT_MS, "Saving your profile to Supabase timed out.");
        const remote = await withTimeout(loadRemoteState(client, s.user.id), REMOTE_TIMEOUT_MS, "Loading your training data timed out.");
        if (cancelled) return;
        const next = remote ?? createBlankState();
        setState(next);
        setStack([{ id: next.activeTab }]);
        setRootTab(next.activeTab);
        setSyncState("synced");
      } catch (err) {
        if (cancelled) return;
        setAuthError(err instanceof Error ? err.message : "Unable to load cloud state.");
        setSyncState("error");
      } finally { if (!cancelled) setBootstrapLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [session, supabase]);

  // Auto-save
  useEffect(() => {
    if (localMode || guestMode) { saveState(state); return; }
    if (!session || bootstrapLoading) return;
    const client = supabase!, s = session;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void (async () => {
        try { setSyncState("saving"); await upsertRemoteState(client, s, state); saveState(state); setSyncState("synced"); }
        catch { saveState(state); setSyncState("error"); }
      })();
    }, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [bootstrapLoading, guestMode, localMode, session, state, supabase]);

  // Desktop wheel scrolling can miss the inner .content-scroll region when the pointer is
  // over the app bar / footer shell. Forward wheel deltas to the active content pane so
  // every screen remains scrollable on laptops and desktops.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const onWheel = (event: WheelEvent) => {
      if (showProfile) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      const activeScrollArea = shell.querySelector<HTMLElement>(".content-scroll");
      if (!activeScrollArea) return;
      if (event.target instanceof Node && activeScrollArea.contains(event.target)) return;
      const canScroll = activeScrollArea.scrollHeight > activeScrollArea.clientHeight;
      if (!canScroll) return;
      activeScrollArea.scrollTop += event.deltaY;
      event.preventDefault();
    };

    shell.addEventListener("wheel", onWheel, { passive: false });
    return () => shell.removeEventListener("wheel", onWheel);
  }, [current.id, showProfile, stack.length]);

  const summary = useMemo(() => computeReadiness(state.assessment, state.drillResults, state.roadmap), [state.assessment, state.drillResults, state.roadmap]);
  const gaps = useMemo(() => gapSummary(state.assessment, state.drillResults), [state.assessment, state.drillResults]);
  const topGap = useMemo(() => gaps.find((g) => g.measured) ?? gaps[0] ?? null, [gaps]);
  const streak = useMemo(() => computeStreak(state.roadmap), [state.roadmap]);
  const coachNote = planSummary ?? (summary.weakest
    ? `Your biggest opportunity right now is ${summary.weakest.label.toLowerCase()} — that's where your next session should focus.`
    : null);

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function generatePlan() {
    if (planLoading) return;
    setPlanLoading(true);
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) });
      const payload = await res.json() as { roadmap: RoadmapState; summary: string | null; summaryError: string | null };
      patchState((prev) => ({ ...prev, roadmap: payload.roadmap }));
      setPlanSummary(payload.summary);
      goTab("plan");
    } finally {
      setPlanLoading(false);
    }
  }

  function handleOnboardComplete(assessment: AssessmentState, drillResults: Record<string, DrillResult>) {
    if (!session) {
      setGuestMode(true);
      saveGuestMode(true);
    }
    patchState((prev) => ({
      ...prev,
      onboardingComplete: true,
      assessment,
      drillResults: { ...prev.drillResults, ...drillResults },
    }));
    setRootTab("today");
    setStack([{ id: "today" }, { id: "readiness", firstRun: true }]);
  }

  async function runCoachRequest(prompt: string) {
    setCoachError(null);
    patchState((prev) => ({ ...prev, coach: { ...prev.coach, status: "loading" } }));
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, state }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCoachError(typeof payload?.error === "string" ? payload.error : "The coach couldn't respond. Try again.");
        patchState((prev) => ({ ...prev, coach: { ...prev.coach, status: "error" } }));
        return;
      }
      const assistantMsg: CoachMessage = { id: makeId(), role: "assistant", text: (payload.answer as string[]).join(" "), createdAt: new Date().toISOString() };
      patchState((prev) => ({ ...prev, coach: { ...prev.coach, status: "idle", messages: [...prev.coach.messages, assistantMsg] } }));
    } catch {
      setCoachError("Couldn't reach the coach. Check your connection and try again.");
      patchState((prev) => ({ ...prev, coach: { ...prev.coach, status: "error" } }));
    }
  }

  function sendCoach(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || state.coach.status === "loading") return;
    setLastCoachPrompt(trimmed);
    const userMsg: CoachMessage = { id: makeId(), role: "user", text: trimmed, createdAt: new Date().toISOString() };
    patchState((prev) => ({ ...prev, coach: { ...prev.coach, draft: "", messages: [...prev.coach.messages, userMsg] } }));
    void runCoachRequest(trimmed);
  }

  function retryCoach() {
    if (lastCoachPrompt) void runCoachRequest(lastCoachPrompt);
  }

  function saveDrillResult(drillId: string, result: { value: number | null; skipped: boolean }, sessionNodeId?: string) {
    patchState((prev) => {
      const drillResults: Record<string, DrillResult> = {
        ...prev.drillResults,
        [drillId]: { drillId, value: result.value, recordedAt: new Date().toISOString(), skipped: result.skipped },
      };
      let roadmap = prev.roadmap;
      if (sessionNodeId) {
        const node = prev.roadmap.nodes.find((item) => item.id === sessionNodeId);
        const sessionComplete = node
          ? node.drillIds.every((id) => {
            const saved = id === drillId ? drillResults[drillId] : drillResults[id];
            return Boolean(saved && (saved.skipped || saved.value != null));
          })
          : false;
        roadmap = sessionComplete ? completeRoadmapNode(prev.roadmap, sessionNodeId) : prev.roadmap;
      }
      return { ...prev, drillResults, roadmap };
    });
  }

  function toggleSavedDrill(drillId: string) {
    patchState((prev) => {
      const saved = prev.library.savedDrills;
      const next = saved.includes(drillId) ? saved.filter((id) => id !== drillId) : [...saved, drillId];
      return { ...prev, library: { ...prev.library, savedDrills: next } };
    });
  }

  function saveMeal(meal: Meal) {
    patchState((prev) => ({ ...prev, nutrition: { ...prev.nutrition, meals: [...prev.nutrition.meals, meal] } }));
    back();
  }

  function deleteMeal(mealId: string) {
    patchState((prev) => ({ ...prev, nutrition: { ...prev.nutrition, meals: prev.nutrition.meals.filter((m) => m.id !== mealId) } }));
  }

  async function handleAuthSubmit(mode: "sign-in" | "sign-up", email: string, password: string) {
    if (!supabase) return;
    setAuthError(null); setAuthLoading(true);
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) { setAuthError(result.error.message); setAuthLoading(false); return; }
    setGuestMode(false);
    clearGuestMode();
    if (mode === "sign-up" && !result.data.session) { setAuthError("Account created! Check your email to confirm, then sign in."); setAuthLoading(false); }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    clearState(); setState(createBlankState()); setSession(null);
    setBootstrapLoading(false); setSyncState("signed-out"); setAuthLoading(false);
    setGuestMode(false);
    clearGuestMode();
    setDemoMode(false); setPlanSummary(null);
    setRootTab("today"); setStack([{ id: "today" }]);
  }

  function loadDemo() {
    const next = createDemoState();
    setState(next);
    saveState(next);
    setGuestMode(true);
    saveGuestMode(true);
    setDemoMode(true);
    setShowProfile(false);
    setPlanSummary(null);
    setRootTab("today");
    setStack([{ id: "today" }]);
  }

  function startLocalAssessment() {
    const next = createBlankState();
    setState(next);
    saveState(next);
    setGuestMode(true);
    saveGuestMode(true);
    setDemoMode(false);
    setShowProfile(false);
    setPlanSummary(null);
    setRootTab("today");
    setStack([{ id: "today" }]);
  }

  function resetAll() {
    const next = createBlankState();
    setState(next);
    clearState();
    saveState(next);
    setShowProfile(false);
    setDemoMode(false);
    if (!session) {
      setGuestMode(true);
      saveGuestMode(true);
    }
    setPlanSummary(null);
    setRootTab("today");
    setStack([{ id: "today" }]);
  }

  // ─── Gates ──────────────────────────────────────────────────────────────────

  if (!hydrated) return <LoadingScreen message="Loading VarFoot…" />;
  if (!localMode && !demoMode && !guestMode && (authLoading || bootstrapLoading)) return <LoadingScreen message="Loading your profile…" />;
  if (!localMode && !demoMode && !guestMode && !session) {
    return <Auth loading={authLoading} error={authError} onSubmit={handleAuthSubmit} onDemo={loadDemo} onStartLocal={startLocalAssessment} />;
  }
  if (!state.onboardingComplete) {
    return (
      <div className="phone-shell">
        <div className="phone-column">
          <Onboarding initialAssessment={state.assessment} onComplete={handleOnboardComplete} />
        </div>
      </div>
    );
  }

  const showNav = isRootScreen(current);
  const avatarTap = () => setShowProfile(true);

  function renderScreen() {
    switch (current.id) {
      case "today":
        return (
          <Today
            assessment={state.assessment}
            summary={summary}
            roadmap={state.roadmap}
            topGap={topGap}
            streak={streak}
            coachNote={coachNote}
            onAvatarTap={avatarTap}
            onOpenSession={(node) => go({ id: "roadmapSession", nodeId: node.id })}
            onOpenReadiness={() => go({ id: "readiness", firstRun: false })}
            onOpenGapAnalysis={() => go({ id: "gapAnalysis" })}
            onGeneratePlan={() => void generatePlan()}
            onOpenCoach={() => goTab("coach")}
          />
        );
      case "plan":
        return (
          <Roadmap
            roadmap={state.roadmap}
            assessment={state.assessment}
            summary={planSummary}
            onBack={() => goTab("today")}
            onOpenNode={(node) => go({ id: "roadmapSession", nodeId: node.id })}
            onRegenerate={() => void generatePlan()}
          />
        );
      case "train":
        return (
          <Progress
            assessment={state.assessment}
            drillResults={state.drillResults}
            summary={summary}
            streak={streak}
            onAvatarTap={avatarTap}
            onOpenDrill={(drillId) => go({ id: "drillDetail", drillId })}
          />
        );
      case "fuel":
        return (
          <Nutrition
            meals={state.nutrition.meals}
            targets={state.nutrition}
            streak={streak}
            onAvatarTap={avatarTap}
            onLogMeal={() => go({ id: "mealBuilder" })}
            onDeleteMeal={deleteMeal}
          />
        );
      case "coach":
        return (
          <Coach
            messages={state.coach.messages}
            draft={state.coach.draft}
            status={state.coach.status}
            error={coachError}
            streak={streak}
            onAvatarTap={avatarTap}
            onDraftChange={(text) => patchState((prev) => ({ ...prev, coach: { ...prev.coach, draft: text } }))}
            onSend={sendCoach}
            onRetry={retryCoach}
          />
        );
      case "readiness":
        return (
          <Readiness
            summary={summary}
            isFirstRun={current.firstRun}
            onViewGaps={() => go({ id: "gapAnalysis" })}
            onGeneratePlan={() => void generatePlan()}
            onContinue={() => goTab("today")}
          />
        );
      case "gapAnalysis":
        return <GapAnalysis gaps={gaps} onBack={back} onOpenDrill={(drillId) => go({ id: "drillDetail", drillId })} />;
      case "roadmapSession": {
        const node = state.roadmap.nodes.find((n) => n.id === current.nodeId);
        if (!node) { back(); return null; }
        return (
          <RoadmapSession
            node={node}
            drillResults={state.drillResults}
            onBack={back}
            onOpenDrill={(drillId) => go({ id: "drillDetail", drillId, sessionNodeId: node.id })}
          />
        );
      }
      case "drillDetail": {
        const drill = getDrill(current.drillId);
        if (!drill) { back(); return null; }
        const sessionNode = current.sessionNodeId
          ? state.roadmap.nodes.find((item) => item.id === current.sessionNodeId) ?? null
          : null;
        const sessionCompletedCount = sessionNode
          ? sessionNode.drillIds.filter((id) => {
            const saved = state.drillResults[id];
            return Boolean(saved && (saved.skipped || saved.value != null));
          }).length
          : 0;
        return (
          <DrillDetail
            drill={drill}
            previousResult={state.drillResults[drill.id]}
            isSaved={state.library.savedDrills.includes(drill.id)}
            sessionProgress={sessionNode ? {
              completedCount: sessionCompletedCount,
              totalCount: sessionNode.drillIds.length,
              willCompleteOnSave:
                sessionNode.status !== "completed" &&
                sessionCompletedCount + (state.drillResults[drill.id] ? 0 : 1) >= sessionNode.drillIds.length,
            } : null}
            onBack={back}
            onSave={(result) => saveDrillResult(drill.id, result, current.sessionNodeId)}
            onToggleSaved={() => toggleSavedDrill(drill.id)}
          />
        );
      }
      case "mealBuilder":
        return <MealBuilder onBack={back} onSaveMeal={saveMeal} />;
      default:
        return null;
    }
  }

  return (
    <div className="phone-shell">
      <div ref={shellRef} className="phone-column">
        {authError && !showProfile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "rgba(255,107,94,.08)", borderBottom: "1px solid rgba(255,107,94,.14)", color: "var(--red)", fontSize: 13, fontWeight: 600 }}>
            <span style={{ flex: 1 }}>{authError}</span>
            <button type="button" onClick={() => setAuthError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)" }}><X size={16} /></button>
          </div>
        )}

        {renderScreen()}

        {showNav && <BottomNav active={rootTab} onSelect={goTab} />}
        {showProfile && (
          <Profile
            state={state}
            localMode={localMode}
            syncState={syncState}
            onSignOut={handleSignOut}
            onLoadDemo={loadDemo}
            onReset={resetAll}
            onClose={() => setShowProfile(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function Page() { return <App />; }
