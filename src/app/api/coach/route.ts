import { z } from "zod";

import { buildCoachContext } from "@/lib/coachContext";
import { streamGemini } from "@/lib/gemini";
import { appStateSchema, createBlankState } from "@/lib/varfoot";

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(500),
});

const bodySchema = z.object({
  prompt: z.string().min(1).max(480),
  history: z.array(historyMessageSchema).max(12).optional(),
  state: z.unknown().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Prompt is required." }), { status: 400 });
  }

  const stateResult = appStateSchema.safeParse(parsed.data.state);
  const state = stateResult.success ? stateResult.data : createBlankState();
  const context = buildCoachContext(state);

  // Include up to last 6 messages (3 exchanges) so Gemini has conversation memory.
  const history = (parsed.data.history ?? []).slice(-6);
  const historyBlock = history.length
    ? "\nRecent conversation (most recent last):\n" +
      history.map((m) => `${m.role === "user" ? "Player" : "Coach"}: ${m.text}`).join("\n") +
      "\n"
    : "";

  const prompt = [
    "You are the VarFoot AI coach — direct, specific, and encouraging, talking to a teenage soccer player who wants to make varsity.",
    "Use ONLY the player data below. Never invent stats, never give medical advice, never guess at information that isn't provided.",
    "",
    context,
    historyBlock,
    `Player's question: ${parsed.data.prompt}`,
    "",
    "Reply in at most four short lines. Lead with the single highest-priority adjustment given their weakest area and largest gaps. Be concrete (use the actual numbers above) and end with one specific next action.",
  ].join("\n");

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamGemini(prompt)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Gemini request failed.";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
