"use client";

// Meal builder — search the real USDA FoodData Central database (server-side via
// /api/nutrition/search, see that route for the key handling), pick a food, choose an
// amount in grams, and stack ingredients into one meal before saving. Every macro is
// computed client-side from the USDA per-100g values × the chosen amount — nothing here
// is hand-typed or seeded. Mirrors the Coach screen's explicit loading/error/retry pattern.

import { useState } from "react";
import { ArrowClockwise, Check, Coffee, Hamburger, MagnifyingGlass, Moon, Plus, Sun, Trash, WarningCircle, X } from "@phosphor-icons/react";

import { BackBar, Btn, Eyebrow, FlatCard, Stepper } from "@/components/ui";
import type { FoodSearchResult } from "@/app/api/nutrition/search/route";
import { cn } from "@/lib/utils";
import { makeId, mealTypes, type Meal, type MealIngredient, type MealType } from "@/lib/varfoot";

const MEAL_ICONS: Record<MealType, typeof Coffee> = {
  Breakfast: Coffee,
  Lunch: Sun,
  Snack: Hamburger,
  Dinner: Moon,
};

type SearchStatus = "idle" | "loading" | "error";

function scaleToAmount(food: FoodSearchResult, grams: number) {
  const factor = grams / 100;
  return {
    calories: Math.round(food.per100g.calories * factor),
    protein: Math.round(food.per100g.protein * factor),
    carbs: Math.round(food.per100g.carbs * factor),
    fat: Math.round(food.per100g.fat * factor),
  };
}

function AmountPicker({ food, onAdd, onCancel }: { food: FoodSearchResult; onAdd: (grams: number) => void; onCancel: () => void }) {
  const [grams, setGrams] = useState(100);
  const macros = scaleToAmount(food, grams);
  return (
    <FlatCard style={{ borderColor: "var(--green-line)" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p style={{ fontSize: 13, fontWeight: 800 }}>{food.name}</p>
          {food.brand && <p style={{ fontSize: 11, color: "var(--text-3)" }}>{food.brand}</p>}
        </div>
        <button type="button" onClick={onCancel} aria-label="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
          <X size={16} weight="bold" />
        </button>
      </div>
      <Eyebrow className="mb-2">Amount</Eyebrow>
      <Stepper
        display={`${grams} g`}
        onDecrement={() => setGrams((g) => Math.max(10, g - 10))}
        onIncrement={() => setGrams((g) => Math.min(1000, g + 10))}
      />
      <div className="flex justify-between mt-3 mb-4" style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-plex-mono)" }}>
        <span>{macros.calories} kcal</span>
        <span>{macros.protein}g protein</span>
        <span>{macros.carbs}g carbs</span>
        <span>{macros.fat}g fat</span>
      </div>
      <Btn className="w-full" sm onClick={() => onAdd(grams)}>
        <Plus size={14} weight="bold" /> Add to meal
      </Btn>
    </FlatCard>
  );
}

export function MealBuilder({
  onBack,
  onSaveMeal,
}: {
  onBack: () => void;
  onSaveMeal: (meal: Meal) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [picking, setPicking] = useState<FoodSearchResult | null>(null);
  const [ingredients, setIngredients] = useState<MealIngredient[]>([]);
  const [mealType, setMealType] = useState<MealType>("Breakfast");

  const runSearch = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/nutrition/search?query=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(typeof json?.error === "string" ? json.error : "Search failed. Try again.");
        return;
      }
      setResults(Array.isArray(json?.results) ? json.results : []);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Couldn't reach the food database. Check your connection and try again.");
    }
  };

  const addIngredient = (food: FoodSearchResult, grams: number) => {
    const macros = scaleToAmount(food, grams);
    setIngredients((prev) => [
      ...prev,
      { id: makeId(), fdcId: food.fdcId, name: food.name, amount: grams, unit: "g", ...macros },
    ]);
    setPicking(null);
  };

  const removeIngredient = (id: string) => setIngredients((prev) => prev.filter((i) => i.id !== id));

  const totals = ingredients.reduce(
    (sum, i) => ({ calories: sum.calories + i.calories, protein: sum.protein + i.protein, carbs: sum.carbs + i.carbs, fat: sum.fat + i.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const handleSave = () => {
    if (ingredients.length === 0) return;
    onSaveMeal({ id: makeId(), type: mealType, loggedAt: new Date().toISOString(), ingredients });
  };

  return (
    <>
      <BackBar title="Log a meal" sub="Search real foods, build your plate" onBack={onBack} />
      <div className="content-area content-scroll" style={{ padding: "16px 16px 8px" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); void runSearch(); }}
          style={{ display: "flex", gap: 8, marginBottom: 14 }}
        >
          <input
            className="vf-input"
            style={{ flex: 1 }}
            placeholder="Search USDA foods — e.g. chicken breast, banana, oats…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="vf-stepper-btn" aria-label="Search" style={{ width: 50, height: 50 }}>
            <MagnifyingGlass size={18} weight="bold" />
          </button>
        </form>

        {status === "loading" && (
          <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "12px 0" }}>Searching USDA FoodData Central…</p>
        )}

        {status === "error" && (
          <FlatCard style={{ borderColor: "var(--red)", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
            <WarningCircle size={18} weight="fill" color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 8 }}>{error}</p>
              <button type="button" onClick={() => void runSearch()} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--green)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                <ArrowClockwise size={14} weight="bold" /> Retry search
              </button>
            </div>
          </FlatCard>
        )}

        {picking && (
          <div style={{ marginBottom: 14 }}>
            <AmountPicker food={picking} onAdd={(grams) => addIngredient(picking, grams)} onCancel={() => setPicking(null)} />
          </div>
        )}

        {status === "idle" && results.length > 0 && !picking && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {results.map((food) => (
              <button
                key={food.fdcId}
                type="button"
                onClick={() => setPicking(food)}
                className="vf-card-flat"
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", border: "1px solid var(--border)" }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800 }}>{food.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {food.brand ? `${food.brand} · ` : ""}{food.per100g.calories} kcal / 100g
                  </p>
                </div>
                <Plus size={16} weight="bold" color="var(--green)" />
              </button>
            ))}
          </div>
        )}

        {ingredients.length > 0 && (
          <FlatCard style={{ marginBottom: 18 }}>
            <Eyebrow tone="green" className="mb-2">This meal ({ingredients.length})</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700 }}>{ing.name} <span style={{ color: "var(--text-3)" }}>· {ing.amount}{ing.unit}</span></p>
                    <p style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-plex-mono)" }}>
                      {ing.calories} kcal · {ing.protein}g P · {ing.carbs}g C · {ing.fat}g F
                    </p>
                  </div>
                  <button type="button" onClick={() => removeIngredient(ing.id)} aria-label="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
                    <Trash size={14} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
            <div className="vf-divider" style={{ marginBottom: 10 }} />
            <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ color: "var(--green)", fontFamily: "var(--font-plex-mono)" }}>
                {totals.calories} kcal · {totals.protein}P · {totals.carbs}C · {totals.fat}F
              </span>
            </div>
          </FlatCard>
        )}

        {ingredients.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <Eyebrow className="mb-2">Meal type</Eyebrow>
            <div className="vf-seg">
              {mealTypes.map((type) => {
                const Icon = MEAL_ICONS[type];
                return (
                  <button key={type} type="button" className={cn("vf-seg-btn", mealType === type && "on")} onClick={() => setMealType(type)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Icon size={14} weight="bold" /> {type}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="vf-footer">
        <Btn className="w-full" onClick={handleSave} disabled={ingredients.length === 0}>
          <Check size={16} weight="bold" /> Save meal to log
        </Btn>
      </div>
    </>
  );
}
