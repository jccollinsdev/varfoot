import { NextResponse } from "next/server";
import { z } from "zod";

import { askGemini } from "@/lib/gemini";
import { generateRoadmap } from "@/lib/roadmap";
import { appStateSchema, createBlankState, teamLevelLabels } from "@/lib/varfoot";

const bodySchema = z.object({
  state: z.unknown().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  const stateResult = appStateSchema.safeParse(parsed.success ? parsed.data.state : undefined);
  const state = stateResult.success ? stateResult.data : createBlankState();

  // Roadmap generation is deterministic and code-based (src/lib/roadmap.ts) — it always
  // succeeds and never depends on Gemini. Only the one-line motivational summary is AI-
  // generated, and it fails explicitly (summaryError) rather than substituting fake text.
  const roadmap = generateRoadmap({
    assessment: state.assessment,
    drillResults: state.drillResults,
    existing: state.roadmap,
  });

  const upcomingSessions = roadmap.nodes.filter((n) => n.status !== "completed").length;
  const summaryResult = await askGemini(
    [
      "You are the VarFoot AI coach. Write exactly ONE short, specific sentence (no hashtags, no emoji) that frames this freshly generated training roadmap for the player.",
      `Player: ${state.assessment.name || "the player"}, targeting the ${teamLevelLabels[state.assessment.targetLevel]} team` +
        (roadmap.goalDate ? ` by ${roadmap.goalDate}` : " with no tryout date set yet") +
        ".",
      `The roadmap schedules ${upcomingSessions} upcoming session(s) prioritized around their largest skill gaps.`,
      "Do not invent stats or details that weren't given to you.",
    ].join("\n"),
  );

  return NextResponse.json({
    roadmap,
    summary: summaryResult.ok ? summaryResult.text.trim() : null,
    summaryError: summaryResult.ok ? null : summaryResult.error,
  });
}
