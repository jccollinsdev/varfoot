import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODEL = "gemini-2.5-flash";
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 400;

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Gemini with one internal retry on transient failure and always returns an explicit
 * ok/error result — callers (api/coach, api/plan) surface `error` directly to the UI's
 * retry state rather than silently substituting fabricated "personalized" text.
 */
export async function askGemini(prompt: string): Promise<GeminiResult> {
  if (!ai) {
    return { ok: false, error: "AI coaching isn't configured on the server (missing GEMINI_API_KEY)." };
  }

  let lastError = "Gemini returned an empty response.";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
      const text = response.text?.trim();
      if (text) {
        return { ok: true, text };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Gemini request failed.";
      console.error(`[gemini] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError);
    }

    if (attempt < MAX_ATTEMPTS) {
      await delay(RETRY_DELAY_MS * attempt);
    }
  }

  return { ok: false, error: lastError };
}
