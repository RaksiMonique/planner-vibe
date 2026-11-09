import 'server-only';
import { addDays, parseISO } from 'date-fns';
import { and, eq, gte, isNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import {
  groceryItems,
  groceryLists,
  ingredients,
  mealPlanEntries,
  mealPlans,
  mealTemplates,
  recipes,
  type MealTemplateEntry,
} from '@/db/schema';
import { getSegmentBySlug, listSegments } from '@/features/life-segments/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { removeImage, uploadImage } from '@/lib/storage';
import { toDateKey, weekRange, type WeekStartsOn } from '@/lib/dates';
import { consolidateIngredients, contributionsForMeals } from './consolidate';
import {
  getGroceryList,
  getMealsBetween,
  getRecipesWithIngredients,
  type GroceryList,
  type MealPlan,
  type MealTemplate,
  type Recipe,
} from './queries';
import type { GroceryItemInput, MealEntryInput, RecipeInput, TemplateInput } from './schema';

const numericOrNull = (n: number | undefined | null) =>
  n === undefined || n === null ? null : String(n);

// ───────────────────────────── Recipes ─────────────────────────────

export async function getRecipeOrThrow(userId: string, id: string): Promise<Recipe> {
  const [row] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.userId, userId), eq(recipes.id, id), isNull(recipes.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That recipe does not exist.');
  return row;
}

function recipeValues(input: RecipeInput) {
  return {
    title: input.title,
    description: input.description ?? null,
    instructions: input.instructions ?? null,
    servings: input.servings,
    prepMinutes: input.prepMinutes ?? null,
    cookMinutes: input.cookMinutes ?? null,
    category: input.category ?? null,
    dietaryTags: input.dietaryTags,
    rating: input.rating ?? null,
    notes: input.notes ?? null,
    isFavourite: input.isFavourite,
  };
}

async function replaceIngredients(
  userId: string,
  recipeId: string,
  rows: RecipeInput['ingredients']
) {
  await db
    .delete(ingredients)
    .where(and(eq(ingredients.userId, userId), eq(ingredients.recipeId, recipeId)));
  if (rows.length === 0) return;
  await db.insert(ingredients).values(
    rows.map((i, index) => ({
      userId,
      recipeId,
      name: i.name,
      quantity: numericOrNull(i.quantity),
      unit: i.unit ?? null,
      category: i.category ?? null,
      note: i.note ?? null,
      sortOrder: index,
    }))
  );
}

export async function createRecipe(
  userId: string,
  input: RecipeInput,
  image?: File | null
): Promise<Recipe> {
  const imagePath = image ? await uploadImage(userId, 'recipes', image) : null;
  const [row] = await db
    .insert(recipes)
    .values({ ...recipeValues(input), userId, imagePath })
    .returning();
  await replaceIngredients(userId, row.id, input.ingredients);
  return row;
}

export async function updateRecipe(
  userId: string,
  id: string,
  input: RecipeInput,
  opts: { image?: File | null; removeImage?: boolean } = {}
): Promise<Recipe> {
  const current = await getRecipeOrThrow(userId, id);
  let imagePath = current.imagePath;
  if (opts.image) {
    imagePath = await uploadImage(userId, 'recipes', opts.image);
    await removeImage(userId, current.imagePath);
  } else if (opts.removeImage && current.imagePath) {
    await removeImage(userId, current.imagePath);
    imagePath = null;
  }
  const [row] = await db
    .update(recipes)
    .set({ ...recipeValues(input), imagePath })
    .where(and(eq(recipes.userId, userId), eq(recipes.id, id)))
    .returning();
  await replaceIngredients(userId, id, input.ingredients);
  return row;
}

/** Soft delete. Planned meals keep pointing at the recipe row, so history survives. */
export async function removeRecipe(userId: string, id: string) {
  await getRecipeOrThrow(userId, id);
  await db
    .update(recipes)
    .set({ deletedAt: new Date() })
    .where(and(eq(recipes.userId, userId), eq(recipes.id, id)));
}

export async function setRecipeFavourite(userId: string, id: string, isFavourite: boolean) {
  await getRecipeOrThrow(userId, id);
  await db
    .update(recipes)
    .set({ isFavourite })
    .where(and(eq(recipes.userId, userId), eq(recipes.id, id)));
}

// ───────────────────────────── Meal plans ─────────────────────────────

/** Meal plans default to Lifestyle & Home, then the user's first segment (instructions.md 5.3). */
async function defaultMealSegmentId(userId: string): Promise<string> {
  try {
    return (await getSegmentBySlug(userId, 'home')).id;
  } catch {
    const [first] = await listSegments(userId);
    if (!first) throw new ValidationError('Create a Life Segment first.');
    return first.id;
  }
}

export function weekKeysFor(dateKey: string, weekStartsOn: WeekStartsOn) {
  const { start, end } = weekRange(parseISO(dateKey), weekStartsOn);
  return { startKey: toDateKey(start), endKey: toDateKey(end) };
}

/** The plan covering the week that contains `dateKey`, created on first use. */
export async function ensurePlanForWeek(
  userId: string,
  dateKey: string,
  weekStartsOn: WeekStartsOn
): Promise<MealPlan> {
  const { startKey, endKey } = weekKeysFor(dateKey, weekStartsOn);
  const [existing] = await db
    .select()
    .from(mealPlans)
    .where(
      and(
        eq(mealPlans.userId, userId),
        isNull(mealPlans.deletedAt),
        lte(mealPlans.startDate, dateKey),
        gte(mealPlans.endDate, dateKey)
      )
    )
    .limit(1);
  if (existing) return existing;
  const [row] = await db
    .insert(mealPlans)
    .values({
      userId,
      lifeSegmentId: await defaultMealSegmentId(userId),
      name: `Week of ${startKey}`,
      startDate: startKey,
      endDate: endKey,
    })
    .returning();
  return row;
}

/** One meal per slot per day: replaces whatever was in that slot. */
export async function setMealEntry(
  userId: string,
  input: MealEntryInput,
  weekStartsOn: WeekStartsOn
) {
  if (input.recipeId) await getRecipeOrThrow(userId, input.recipeId);
  const plan = await ensurePlanForWeek(userId, input.date, weekStartsOn);
  await db
    .delete(mealPlanEntries)
    .where(
      and(
        eq(mealPlanEntries.userId, userId),
        eq(mealPlanEntries.planId, plan.id),
        eq(mealPlanEntries.date, input.date),
        eq(mealPlanEntries.slot, input.slot)
      )
    );
  await db.insert(mealPlanEntries).values({
    userId,
    planId: plan.id,
    date: input.date,
    slot: input.slot,
    recipeId: input.recipeId ?? null,
    customMeal: input.recipeId ? null : (input.customMeal ?? null),
    servings: input.servings,
    note: input.note ?? null,
  });
}

export async function removeMealEntry(userId: string, id: string) {
  await db
    .delete(mealPlanEntries)
    .where(and(eq(mealPlanEntries.userId, userId), eq(mealPlanEntries.id, id)));
}

// ───────────────────────────── Templates ─────────────────────────────

function rangeFor(input: Pick<TemplateInput, 'kind' | 'date'>, weekStartsOn: WeekStartsOn) {
  if (input.kind === 'day') return { startKey: input.date, endKey: input.date };
  return weekKeysFor(input.date, weekStartsOn);
}

/** Saves the visible day or week as a template; a template with the same name is replaced. */
export async function saveTemplate(
  userId: string,
  input: TemplateInput,
  weekStartsOn: WeekStartsOn
): Promise<MealTemplate> {
  const { startKey, endKey } = rangeFor(input, weekStartsOn);
  const { entries } = await getMealsBetween(userId, startKey, endKey);
  if (entries.length === 0) throw new ValidationError('Plan at least one meal first.');
  const start = parseISO(startKey);
  const templateEntries: MealTemplateEntry[] = entries.map((e) => ({
    dayOffset: Math.round((parseISO(e.date).getTime() - start.getTime()) / 86_400_000),
    slot: e.slot,
    recipeId: e.recipeId,
    customMeal: e.customMeal,
    servings: e.servings,
  }));
  const [existing] = await db
    .select()
    .from(mealTemplates)
    .where(and(eq(mealTemplates.userId, userId), eq(mealTemplates.name, input.name)))
    .limit(1);
  if (existing) {
    const [row] = await db
      .update(mealTemplates)
      .set({ kind: input.kind, entries: templateEntries })
      .where(eq(mealTemplates.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(mealTemplates)
    .values({ userId, name: input.name, kind: input.kind, entries: templateEntries })
    .returning();
  return row;
}

/** Writes a template onto the week (or day) containing `dateKey`, slot by slot. */
export async function applyTemplate(
  userId: string,
  templateId: string,
  dateKey: string,
  weekStartsOn: WeekStartsOn
): Promise<number> {
  const [template] = await db
    .select()
    .from(mealTemplates)
    .where(and(eq(mealTemplates.userId, userId), eq(mealTemplates.id, templateId)))
    .limit(1);
  if (!template) throw new NotFoundError('That template does not exist.');
  const startKey = template.kind === 'day' ? dateKey : weekKeysFor(dateKey, weekStartsOn).startKey;
  const start = parseISO(startKey);
  let applied = 0;
  for (const entry of template.entries) {
    const date = toDateKey(addDays(start, entry.dayOffset));
    if (entry.recipeId) {
      try {
        await getRecipeOrThrow(userId, entry.recipeId);
      } catch {
        continue; // the recipe was deleted since the template was saved
      }
    }
    await setMealEntry(
      userId,
      {
        date,
        slot: entry.slot,
        recipeId: entry.recipeId ?? undefined,
        customMeal: entry.customMeal ?? undefined,
        servings: entry.servings,
        note: undefined,
      },
      weekStartsOn
    );
    applied++;
  }
  return applied;
}

export async function removeTemplate(userId: string, id: string) {
  await db
    .delete(mealTemplates)
    .where(and(eq(mealTemplates.userId, userId), eq(mealTemplates.id, id)));
}

// ───────────────────────────── Groceries ─────────────────────────────

async function getListOrThrow(userId: string, id: string): Promise<GroceryList> {
  const [row] = await db
    .select()
    .from(groceryLists)
    .where(
      and(eq(groceryLists.userId, userId), eq(groceryLists.id, id), isNull(groceryLists.deletedAt))
    )
    .limit(1);
  if (!row) throw new NotFoundError('That grocery list does not exist.');
  return row;
}

export async function createGroceryList(userId: string, name: string): Promise<GroceryList> {
  const [row] = await db.insert(groceryLists).values({ userId, name }).returning();
  return row;
}

/**
 * Builds a list from the week containing `dateKey`: every planned recipe's
 * ingredients, scaled by servings and consolidated (instructions.md 8.16).
 */
export async function generateGroceryListFromWeek(
  userId: string,
  dateKey: string,
  weekStartsOn: WeekStartsOn,
  name?: string
): Promise<GroceryList> {
  const { startKey, endKey } = weekKeysFor(dateKey, weekStartsOn);
  const { plan, entries } = await getMealsBetween(userId, startKey, endKey);
  const withRecipes = entries.filter((e) => e.recipeId);
  if (withRecipes.length === 0) {
    throw new ValidationError('Plan at least one meal from a saved recipe first.');
  }
  const recipesById = await getRecipesWithIngredients(
    userId,
    withRecipes.map((e) => e.recipeId as string)
  );
  const lines = consolidateIngredients(contributionsForMeals(withRecipes, recipesById));
  const [list] = await db
    .insert(groceryLists)
    .values({
      userId,
      name: name ?? `Groceries for the week of ${startKey}`,
      planId: plan?.id ?? null,
    })
    .returning();
  if (lines.length > 0) {
    await db.insert(groceryItems).values(
      lines.map((line, index) => ({
        userId,
        listId: list.id,
        name: line.name,
        quantity: numericOrNull(line.quantity),
        unit: line.unit,
        category: line.category,
        recipeId: line.recipeIds[0] ?? null,
        sortOrder: index,
      }))
    );
  }
  return list;
}

export async function addGroceryItem(userId: string, input: GroceryItemInput) {
  await getListOrThrow(userId, input.listId);
  await db.insert(groceryItems).values({
    userId,
    listId: input.listId,
    name: input.name,
    quantity: numericOrNull(input.quantity),
    unit: input.unit ?? null,
    category: input.category ?? null,
    store: input.store ?? null,
    sortOrder: 9999,
  });
}

export async function updateGroceryItem(
  userId: string,
  id: string,
  patch: { quantity?: number; unit?: string; store?: string }
) {
  await db
    .update(groceryItems)
    .set({
      quantity: numericOrNull(patch.quantity),
      unit: patch.unit ?? null,
      store: patch.store ?? null,
    })
    .where(and(eq(groceryItems.userId, userId), eq(groceryItems.id, id)));
}

export async function setGroceryItemPurchased(userId: string, id: string, isPurchased: boolean) {
  await db
    .update(groceryItems)
    .set({ isPurchased })
    .where(and(eq(groceryItems.userId, userId), eq(groceryItems.id, id)));
}

export async function removeGroceryItem(userId: string, id: string) {
  await db
    .delete(groceryItems)
    .where(and(eq(groceryItems.userId, userId), eq(groceryItems.id, id)));
}

export async function setGroceryListStatus(userId: string, id: string, status: 'open' | 'done') {
  await getListOrThrow(userId, id);
  await db
    .update(groceryLists)
    .set({ status })
    .where(and(eq(groceryLists.userId, userId), eq(groceryLists.id, id)));
}

export async function removeGroceryList(userId: string, id: string) {
  await getListOrThrow(userId, id);
  await db
    .update(groceryLists)
    .set({ deletedAt: new Date() })
    .where(and(eq(groceryLists.userId, userId), eq(groceryLists.id, id)));
}

export { getGroceryList };
