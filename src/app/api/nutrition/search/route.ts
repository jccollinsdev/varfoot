import { NextResponse } from "next/server";
import { z } from "zod";

// Server-side wrapper around USDA FoodData Central — mirrors the /api/coach pattern
// (key never reaches the client). Falls back to USDA's public DEMO_KEY for local dev
// when USDA_API_KEY isn't set (documented in .env.example; rate-limited, fine for testing).
// Only Foundation/SR Legacy data types are queried — they carry reliable per-100g
// macros for whole foods (chicken, rice, banana, etc.), unlike inconsistent branded entries.

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

// Permanent USDA nutrient IDs — stable across all FoodData Central food types.
const NUTRIENT_IDS = {
  calories: 1008, // Energy (kcal)
  protein: 1003,
  carbs: 1005, // Carbohydrate, by difference
  fat: 1004, // Total lipid (fat)
} as const;

const querySchema = z.object({ query: z.string().trim().min(2).max(80) });

export type FoodSearchResult = {
  fdcId: number;
  name: string;
  brand: string | null;
  /** Macros per 100g — the client scales these by the chosen amount before logging. */
  per100g: { calories: number; protein: number; carbs: number; fat: number };
};

type UsdaFoodNutrient = { nutrientId?: number; value?: number };
type UsdaFood = {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  foodNutrients?: UsdaFoodNutrient[];
};

function extractMacros(nutrients: UsdaFoodNutrient[] | undefined) {
  const byId = new Map<number, number>();
  for (const n of nutrients ?? []) {
    if (typeof n.nutrientId === "number" && typeof n.value === "number") {
      byId.set(n.nutrientId, n.value);
    }
  }
  const calories = byId.get(NUTRIENT_IDS.calories);
  if (calories == null) return null;
  return {
    calories: Math.round(calories),
    protein: Math.round(byId.get(NUTRIENT_IDS.protein) ?? 0),
    carbs: Math.round(byId.get(NUTRIENT_IDS.carbs) ?? 0),
    fat: Math.round(byId.get(NUTRIENT_IDS.fat) ?? 0),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ query: searchParams.get("query") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Type at least 2 characters to search." }, { status: 400 });
  }

  const apiKey = process.env.USDA_API_KEY?.trim() || "DEMO_KEY";
  const url =
    `${USDA_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}` +
    `&query=${encodeURIComponent(parsed.data.query)}` +
    `&dataType=${encodeURIComponent("Foundation,SR Legacy")}&pageSize=20`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the USDA food database. Check your connection and try again." }, { status: 502 });
  }

  if (!response.ok) {
    const detail = response.status === 403 ? " (check USDA_API_KEY)" : "";
    return NextResponse.json({ error: `USDA food search failed with status ${response.status}${detail}.` }, { status: 502 });
  }

  const json = (await response.json().catch(() => null)) as { foods?: UsdaFood[] } | null;
  const foods = Array.isArray(json?.foods) ? json!.foods! : [];

  const results: FoodSearchResult[] = [];
  for (const food of foods) {
    const macros = extractMacros(food.foodNutrients);
    if (!macros || typeof food.fdcId !== "number" || !food.description) continue;
    results.push({
      fdcId: food.fdcId,
      name: food.description,
      brand: food.brandOwner ?? food.brandName ?? null,
      per100g: macros,
    });
  }

  return NextResponse.json({ results });
}
