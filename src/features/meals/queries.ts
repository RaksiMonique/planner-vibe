import 'server-only';
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  groceryItems,
  groceryLists,
  ingredients,
  mealPlanEntries,
  mealPlans,
  mealTemplates,
  recipes,
} from '@/db/schema';

export type Recipe = typeof recipes.$inferSelect;
export type Ingredient = Omit<typeof ingredients.$inferSelect, 'quantity'> & {
  quantity: number | null;
};
export type RecipeWithIngredients = Recipe & { ingredients: Ingredient[] };
export type MealTemplate = typeof mealTemplates.$inferSelect;
export type MealPlan = typeof mealPlans.$inferSelect;
export type MealPlanEntry = typeof mealPlanEntries.$inferSelect;
export type GroceryList = typeof groceryLists.$inferSelect;
export type GroceryItem = Omit<typeof groceryItems.$inferSelect, 'quantity'> & {
  quantity: number | null;
};
export type GroceryListRow = GroceryList & { itemCount: number; purchasedCount: number };

const num = (v: string | null): number | null => (v === null ? null : Number(v));

function toIngredient(row: typeof ingredients.$inferSelect): Ingredient {
  return { ...row, quantity: num(row.quantity) };
}

export async function listRecipes(
  userId: string,
  filters: { q?: string; tag?: string; favouriteOnly?: boolean } = {}
): Promise<Recipe[]> {
  const conds = [eq(recipes.userId, userId), isNull(recipes.deletedAt)];
  if (filters.q) {
    const like = `%${filters.q.trim()}%`;
    conds.push(or(ilike(recipes.title, like), ilike(recipes.category, like))!);
  }
  if (filters.tag) conds.push(sql`${recipes.dietaryTags} ? ${filters.tag}`);
  if (filters.favouriteOnly) conds.push(eq(recipes.isFavourite, true));
  return db
    .select()
    .from(recipes)
    .where(and(...conds))
    .orderBy(desc(recipes.isFavourite), asc(recipes.title));
}

export async function getRecipe(userId: string, id: string): Promise<RecipeWithIngredients | null> {
  const [row] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.userId, userId), eq(recipes.id, id), isNull(recipes.deletedAt)))
    .limit(1);
  if (!row) return null;
  const rows = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.recipeId, id))
    .orderBy(asc(ingredients.sortOrder), asc(ingredients.createdAt));
  return { ...row, ingredients: rows.map(toIngredient) };
}

export type RecipeOption = Pick<Recipe, 'id' | 'title' | 'servings'>;

export async function listRecipeOptions(userId: string): Promise<RecipeOption[]> {
  return db
    .select({ id: recipes.id, title: recipes.title, servings: recipes.servings })
    .from(recipes)
    .where(and(eq(recipes.userId, userId), isNull(recipes.deletedAt)))
    .orderBy(asc(recipes.title));
}

/** Every dietary tag in use, for the filter chips. */
export async function listRecipeTags(userId: string): Promise<string[]> {
  const rows = await db
    .select({ tags: recipes.dietaryTags })
    .from(recipes)
    .where(and(eq(recipes.userId, userId), isNull(recipes.deletedAt)));
  return [...new Set(rows.flatMap((r) => r.tags))].sort();
}

export type WeekMeals = {
  plan: MealPlan | null;
  entries: Array<MealPlanEntry & { recipe: RecipeOption | null }>;
};

/** The plan (if any) and entries for the days in [startKey, endKey]. */
export async function getMealsBetween(
  userId: string,
  startKey: string,
  endKey: string
): Promise<WeekMeals> {
  const [plan] = await db
    .select()
    .from(mealPlans)
    .where(
      and(
        eq(mealPlans.userId, userId),
        isNull(mealPlans.deletedAt),
        lte(mealPlans.startDate, startKey),
        gte(mealPlans.endDate, startKey)
      )
    )
    .orderBy(desc(mealPlans.createdAt))
    .limit(1);
  const rows = await db
    .select({
      entry: mealPlanEntries,
      recipe: { id: recipes.id, title: recipes.title, servings: recipes.servings },
    })
    .from(mealPlanEntries)
    .leftJoin(recipes, eq(mealPlanEntries.recipeId, recipes.id))
    .where(
      and(
        eq(mealPlanEntries.userId, userId),
        gte(mealPlanEntries.date, startKey),
        lte(mealPlanEntries.date, endKey)
      )
    )
    .orderBy(asc(mealPlanEntries.date), asc(mealPlanEntries.sortOrder));
  return {
    plan: plan ?? null,
    entries: rows.map((r) => ({ ...r.entry, recipe: r.recipe?.id ? r.recipe : null })),
  };
}

/** Recipes with ingredients for a set of ids, keyed by id. */
export async function getRecipesWithIngredients(
  userId: string,
  ids: string[]
): Promise<Record<string, RecipeWithIngredients>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {};
  const recipeRows = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.userId, userId), inArray(recipes.id, unique)));
  const ingRows = await db
    .select()
    .from(ingredients)
    .where(and(eq(ingredients.userId, userId), inArray(ingredients.recipeId, unique)))
    .orderBy(asc(ingredients.sortOrder));
  return Object.fromEntries(
    recipeRows.map((r) => [
      r.id,
      { ...r, ingredients: ingRows.filter((i) => i.recipeId === r.id).map(toIngredient) },
    ])
  );
}

export async function listTemplates(userId: string): Promise<MealTemplate[]> {
  return db
    .select()
    .from(mealTemplates)
    .where(eq(mealTemplates.userId, userId))
    .orderBy(asc(mealTemplates.name));
}

export async function listGroceryLists(userId: string): Promise<GroceryListRow[]> {
  const lists = await db
    .select()
    .from(groceryLists)
    .where(and(eq(groceryLists.userId, userId), isNull(groceryLists.deletedAt)))
    .orderBy(asc(groceryLists.status), desc(groceryLists.createdAt));
  if (lists.length === 0) return [];
  const counts = await db
    .select({
      listId: groceryItems.listId,
      total: sql<number>`count(*)::int`,
      purchased: sql<number>`count(*) filter (where ${groceryItems.isPurchased})::int`,
    })
    .from(groceryItems)
    .where(
      inArray(
        groceryItems.listId,
        lists.map((l) => l.id)
      )
    )
    .groupBy(groceryItems.listId);
  const byList = new Map(counts.map((c) => [c.listId, c]));
  return lists.map((l) => ({
    ...l,
    itemCount: byList.get(l.id)?.total ?? 0,
    purchasedCount: byList.get(l.id)?.purchased ?? 0,
  }));
}

export async function getGroceryList(
  userId: string,
  id: string
): Promise<(GroceryList & { items: GroceryItem[] }) | null> {
  const [list] = await db
    .select()
    .from(groceryLists)
    .where(
      and(eq(groceryLists.userId, userId), eq(groceryLists.id, id), isNull(groceryLists.deletedAt))
    )
    .limit(1);
  if (!list) return null;
  const items = await db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.listId, id))
    .orderBy(asc(groceryItems.category), asc(groceryItems.sortOrder), asc(groceryItems.name));
  return { ...list, items: items.map((i) => ({ ...i, quantity: num(i.quantity) })) };
}
