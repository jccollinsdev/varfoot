import { buildCoachSummary, buildPlanSummary, type AppState } from "./varfoot";

export function generatePlanPayload(state: AppState) {
  return buildPlanSummary(state);
}

export function generateCoachPayload(prompt: string, state: AppState) {
  return buildCoachSummary(prompt, state.assessment);
}

