/**
 * Pure helpers for scaling a recipe and building a grocery list from a week
 * of meals (instructions.md 8.14 to 8.16). No database access.
 */

export type ScalableIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category?: string | null;
};

export type GroceryLine = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  /** Recipes that contributed to this line, deduplicated. */
  recipeIds: string[];
};

export type Contribution = ScalableIngredient & {
  recipeId: string | null;
  /** How many times the recipe's base servings are needed. */
  factor: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

/** Scales one quantity from a recipe's base servings to a target serving count. */
export function scaleQuantity(
  quantity: number | null,
  fromServings: number,
  toServings: number
): number | null {
  if (quantity === null || !Number.isFinite(quantity)) return null;
  if (fromServings <= 0 || toServings <= 0) return quantity;
  return round((quantity * toServings) / fromServings);
}

export function scaleIngredients<T extends ScalableIngredient>(
  ingredients: T[],
  fromServings: number,
  toServings: number
): T[] {
  return ingredients.map((i) => ({
    ...i,
    quantity: scaleQuantity(i.quantity, fromServings, toServings),
  }));
}

const normalise = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/**
 * Adds up ingredient quantities across recipes. Lines with the same name and
 * unit merge (quantities scaled by each recipe's factor); different units of
 * the same ingredient stay separate; ingredients without a quantity are kept
 * once. Sorted by aisle, then name.
 */
export function consolidateIngredients(items: Contribution[]): GroceryLine[] {
  const lines = new Map<string, GroceryLine>();
  for (const item of items) {
    const name = item.name.trim();
    if (!name) continue;
    const hasQuantity = item.quantity !== null && Number.isFinite(item.quantity);
    const unit = hasQuantity ? normalise(item.unit) : '';
    const key = `${normalise(name)}|${unit}`;
    const scaled = hasQuantity ? round((item.quantity as number) * item.factor) : null;
    const existing = lines.get(key);
    if (existing) {
      if (scaled !== null) existing.quantity = round((existing.quantity ?? 0) + scaled);
      if (!existing.category && item.category) existing.category = item.category;
      if (item.recipeId && !existing.recipeIds.includes(item.recipeId)) {
        existing.recipeIds.push(item.recipeId);
      }
      continue;
    }
    lines.set(key, {
      name,
      quantity: scaled,
      unit: hasQuantity ? item.unit?.trim() || null : null,
      category: item.category?.trim() || null,
      recipeIds: item.recipeId ? [item.recipeId] : [],
    });
  }
  return [...lines.values()].sort(
    (a, b) =>
      (a.category ?? 'zzz').localeCompare(b.category ?? 'zzz') ||
      a.name.localeCompare(b.name) ||
      (a.unit ?? '').localeCompare(b.unit ?? '')
  );
}

/** "1.5", "2", "0.25": trims noise so quantities read naturally. */
export function formatQuantity(quantity: number | null | undefined): string {
  if (quantity === null || quantity === undefined || !Number.isFinite(quantity)) return '';
  const fixed = round(quantity);
  return Number.isInteger(fixed) ? String(fixed) : String(fixed).replace(/\.?0+$/, '');
}

/** Builds the contributions for a set of planned meals: each entry's servings over the recipe's base. */
export function contributionsForMeals(
  entries: Array<{ recipeId: string | null; servings: number }>,
  recipes: Record<
    string,
    { servings: number; ingredients: Array<ScalableIngredient & { category?: string | null }> }
  >
): Contribution[] {
  const out: Contribution[] = [];
  for (const entry of entries) {
    if (!entry.recipeId) continue;
    const recipe = recipes[entry.recipeId];
    if (!recipe) continue;
    const factor = recipe.servings > 0 ? entry.servings / recipe.servings : 1;
    for (const ing of recipe.ingredients) {
      out.push({ ...ing, category: ing.category ?? null, recipeId: entry.recipeId, factor });
    }
  }
  return out;
}
