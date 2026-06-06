import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function askGemini(prompt: string) {
  if (!ai) {
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text?.trim() || null;
  } catch {
    return null;
  }
}
