import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { appStateSchema, createBlankState, type AppState } from "@/lib/varfoot";

const PROFILE_TABLE = "varfoot_profiles";
const STATE_TABLE = "varfoot_app_states";

export function normalizeAppState(raw: unknown): AppState {
  const parsed = appStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : createBlankState();
}

export async function loadRemoteState(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from(STATE_TABLE)
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.state) {
    return null;
  }

  return normalizeAppState(data.state);
}

export async function upsertRemoteProfile(client: SupabaseClient, session: Session) {
  const email = session.user.email?.trim() || session.user.id;
  const { error } = await client.from(PROFILE_TABLE).upsert({
    user_id: session.user.id,
    email,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function upsertRemoteState(client: SupabaseClient, session: Session, state: AppState) {
  const now = new Date().toISOString();
  const [{ error: profileError }, { error: stateError }] = await Promise.all([
    client.from(PROFILE_TABLE).upsert({
      user_id: session.user.id,
      email: session.user.email?.trim() || session.user.id,
      updated_at: now,
    }),
    client.from(STATE_TABLE).upsert({
      user_id: session.user.id,
      state,
      updated_at: now,
    }),
  ]);

  if (profileError) {
    throw profileError;
  }

  if (stateError) {
    throw stateError;
  }
}

export async function resetRemoteState(client: SupabaseClient, session: Session) {
  const [profileResult, stateResult] = await Promise.all([
    client.from(PROFILE_TABLE).delete().eq("user_id", session.user.id),
    client.from(STATE_TABLE).delete().eq("user_id", session.user.id),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (stateResult.error) {
    throw stateResult.error;
  }
}
