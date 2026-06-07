import { NextResponse } from "next/server";
import { z } from "zod";

import { buildCoachContext } from "@/lib/coachContext";
import { askGemini } from "@/lib/gemini";
import { appStateSchema, createBlankState } from "@/lib/varfoot";

const bodySchema = z.object({
  prompt: z.string().min(1).max(240),
  state: z.unknown().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const stateResult = appStateSchema.safeParse(parsed.data.state);
  const state = stateResult.success ? stateResult.data : createBlankState();
  const context = buildCoachContext(state);

  const result = await askGemini(
    [
      "You are the VarFoot AI coach — direct, specific, and encouraging, talking to a teenage soccer player who wants to make varsity.",
      "Use ONLY the player data below. Never invent stats, never give medical advice, never guess at information that isn't provided.",
      "",
      context,
      "",
      `Player's question: ${parsed.data.prompt}`,
      "",
      "Reply in at most four short lines. Lead with the single highest-priority adjustment given their weakest area and largest gaps. Be concrete (use the actual numbers above) and end with one specific next action.",
    ].join("\n"),
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    answer: result.text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean),
  });
}
