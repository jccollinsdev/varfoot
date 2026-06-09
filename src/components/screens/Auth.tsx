"use client";

// Sign-in / sign-up gate. Sign-up is the default — everyone goes through the real
// onboarding flow (email confirmation disabled in Supabase dashboard). Demo persona
// is still accessible from the Profile sheet after onboarding.

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const authSchema = z.object({ email: z.string().email("Valid email required"), password: z.string().min(6, "Min 6 characters") });
type AuthForm = z.infer<typeof authSchema>;

export function Auth({
  loading,
  error,
  note,
  onSubmit,
  onLoadDemo,
}: {
  loading: boolean;
  error: string | null;
  note?: string | null;
  onSubmit: (mode: "sign-in" | "sign-up", email: string, password: string) => Promise<void>;
  onLoadDemo?: () => void;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const { register, handleSubmit, formState: { errors } } = useForm<AuthForm>({ resolver: zodResolver(authSchema) });
  const submit = handleSubmit((d) => void onSubmit(mode, d.email, d.password));

  return (
    <div style={{ background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", padding: "0 24px" }}>
      <Image src="/varfoot-mark.svg" alt="VarFooty" width={52} height={52} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-.04em", marginBottom: 4 }}>VarFooty</h1>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24, fontWeight: 600 }}>Train with purpose. Make varsity.</p>

      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,107,94,.1)", border: "1px solid rgba(255,107,94,.25)", color: "var(--red)", fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}
        {note && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--green-ghost)", border: "1px solid var(--green-line)", color: "var(--green)", fontSize: 13, fontWeight: 600 }}>
            {note}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="vf-input" type="email" placeholder="Email" {...register("email")} autoComplete="email" />
          {errors.email && <p style={{ fontSize: 11, color: "var(--red)", marginTop: -6, fontWeight: 700 }}>{errors.email.message}</p>}
          <input className="vf-input" type="password" placeholder="Password (min 6 chars)" {...register("password")} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} />
          {errors.password && <p style={{ fontSize: 11, color: "var(--red)", marginTop: -6, fontWeight: 700 }}>{errors.password.message}</p>}
          <button type="submit" className="vf-btn" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Loading…" : mode === "sign-up" ? "Create account & start" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"))}
          style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
        >
          {mode === "sign-up" ? "Already have an account? Sign in" : "No account? Create one free"}
        </button>

        {onLoadDemo && (
          <>
            <div style={{ height: 1, background: "var(--border-soft)", margin: "4px 0" }} />
            <button
              type="button"
              onClick={onLoadDemo}
              style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
            >
              No time to sign up? Explore as Jordan Reyes →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
