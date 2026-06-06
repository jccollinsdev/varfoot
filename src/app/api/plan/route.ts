import { NextResponse } from "next/server";
import { z } from "zod";
import { createBlankState } from "@/lib/varfoot";
import { generatePlanPayload } from "@/lib/varfoot-api";
import { askGemini } from "@/lib/gemini";

const bodySchema = z.object({
  state: z.any().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  const state = parsed.success ? parsed.data.state ?? createBlankState() : createBlankState();
  const fallback = generatePlanPayload(state);
  const summary = await askGemini(
    [
      "You are VarFoot, a varsity training planner for a teen soccer player.",
      "Write one short motivating sentence that summarizes this roadmap without generic hype.",
      `Player: ${state.assessment.name}, position ${state.assessment.position}, goal ${state.assessment.seasonGoal}.`,
      `Primary focus areas: ${fallback.weeks[0]?.emphasis ?? "passing and first touch"}.`,
      `If possible, mention that the plan is six weeks long and built around the biggest gaps.`,
    ].join("\n"),
  );

  return NextResponse.json({
    ...fallback,
    summary: summary ?? fallback.summary,
  });
}
