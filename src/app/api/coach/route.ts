import { NextResponse } from "next/server";
import { z } from "zod";
import { createBlankState } from "@/lib/varfoot";
import { generateCoachPayload } from "@/lib/varfoot-api";
import { askGemini } from "@/lib/gemini";

const bodySchema = z.object({
  prompt: z.string().min(1).max(240),
  state: z.any().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Prompt is required." },
      { status: 400 },
    );
  }

  const state = parsed.data.state ?? createBlankState();
  const fallback = generateCoachPayload(parsed.data.prompt, state);
  const geminiText = await askGemini(
    [
      "You are VarFoot, a direct but encouraging soccer coach for a teenage player.",
      `Athlete: ${state.assessment.name}, position ${state.assessment.position}, goal ${state.assessment.seasonGoal}.`,
      `Assessment: passing ${state.assessment.passing}, shooting ${state.assessment.shooting}, dribbling ${state.assessment.dribbling}, first touch ${state.assessment.firstTouch}, speed ${state.assessment.speed}, pushups ${state.assessment.pushups}, plank ${state.assessment.plankSeconds}, wall sit ${state.assessment.wallSitSeconds}.`,
      `Question: ${parsed.data.prompt}`,
      "Return a short, specific answer with at most three lines. Mention the highest-priority adjustment first.",
    ].join("\n"),
  );

  return NextResponse.json({
    ...fallback,
    answer: geminiText ? geminiText.split(/\n+/).map((line) => line.trim()).filter(Boolean) : fallback.answer,
  });
}
