"use client";

// Daily fueling log — rebuilt around real Meal[]/getDailyNutritionTotals (USDA-sourced
// ingredients only; no seeded fake entries). Empty state until the player logs something
// real via MealBuilder. Calorie ring + macro bars compare today's totals against the
// PDF-derived targets in AppState.nutrition (see defaultNutritionTargets in varfoot.ts).

import { Coffee, Hamburger, Moon, Plus, Sun, Trash } from "@phosphor-icons/react";

import { Btn, Card, Eyebrow, FlatCard, Ring, TopBar } from "@/components/ui";
import { getDailyNutritionTotals, getIngredientTotals, type Meal, type MealType } from "@/lib/varfoot";

const MEAL_ICONS: Record<MealType, typeof Coffee> = {
  Breakfast: Coffee,
  Lunch: Sun,
  Snack: Hamburger,
  Dinner: Moon,
};

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-2)" }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-plex-mono)", color: "var(--text-3)", fontWeight: 700 }}>
          {Math.round(value)}g / {target}g
        </span>
      </div>
      <div className="vf-bar thin">
        <div className="vf-bar-fill" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function MealCard({ meal, onDelete }: { meal: Meal; onDelete: (mealId: string) => void }) {
  const Icon = MEAL_ICONS[meal.type];
  const totals = getIngredientTotals(meal.ingredients);
  const time = new Date(meal.loggedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <FlatCard>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} weight="bold" color="var(--green)" />
          <span style={{ fontSize: 13, fontWeight: 800 }}>{meal.type}</span>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>· {time}</span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--green)", fontFamily: "var(--font-plex-mono)" }}>{Math.round(totals.calories)} kcal</span>
          <button type="button" onClick={() => onDelete(meal.id)} aria-label="Delete meal" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
            <Trash size={15} weight="bold" />
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {meal.ingredients.map((ing) => (
          <div key={ing.id} className="flex justify-between" style={{ fontSize: 12, color: "var(--text-2)" }}>
            <span>{ing.name} <span style={{ color: "var(--text-3)" }}>· {ing.amount}{ing.unit}</span></span>
            <span style={{ fontFamily: "var(--font-plex-mono)", color: "var(--text-3)" }}>{ing.calories} kcal</span>
          </div>
        ))}
      </div>
    </FlatCard>
  );
}

export function Nutrition({
  meals,
  targets,
  streak,
  onAvatarTap,
  onLogMeal,
  onDeleteMeal,
}: {
  meals: Meal[];
  targets: { calorieTarget: number; proteinTarget: number; carbTarget: number; fatTarget: number };
  streak: number;
  onAvatarTap: () => void;
  onLogMeal: () => void;
  onDeleteMeal: (mealId: string) => void;
}) {
  const totals = getDailyNutritionTotals(meals);
  const caloriePct = targets.calorieTarget > 0 ? Math.min(1, totals.calories / targets.calorieTarget) : 0;

  return (
    <>
      <TopBar title="Fuel" streak={streak} onAvatarTap={onAvatarTap} />
      <div className="content-area content-scroll" style={{ padding: "18px 18px 28px" }}>
        <Card style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
          <Ring size={104} pct={caloriePct} sw={9}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 19, fontWeight: 900, fontFamily: "var(--font-plex-mono)", lineHeight: 1 }}>{Math.round(totals.calories)}</p>
              <p style={{ fontSize: 9, fontWeight: 800, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>/ {targets.calorieTarget} kcal</p>
            </div>
          </Ring>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <MacroBar label="Protein" value={totals.protein} target={targets.proteinTarget} color="var(--green)" />
            <MacroBar label="Carbs" value={totals.carbs} target={targets.carbTarget} color="var(--blue)" />
            <MacroBar label="Fat" value={totals.fat} target={targets.fatTarget} color="var(--yellow)" />
          </div>
        </Card>

        <div style={{ marginBottom: 18 }}>
          <Btn className="w-full" onClick={onLogMeal}>
            <Plus size={16} weight="bold" /> Log a meal
          </Btn>
        </div>

        {meals.length === 0 ? (
          <FlatCard style={{ textAlign: "center", padding: "28px 18px" }}>
            <Eyebrow className="mb-2">Today&rsquo;s log is empty</Eyebrow>
            <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.55 }}>
              Search the USDA food database and add real meals — every number here comes straight from what you log.
            </p>
          </FlatCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...meals].reverse().map((meal) => (
              <MealCard key={meal.id} meal={meal} onDelete={onDeleteMeal} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
