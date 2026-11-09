'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  fail,
  formValues,
  fromError,
  fromZodError,
  ok,
  type ActionResult,
} from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { getPreferences } from '@/features/settings/service';
import {
  applyTemplateInput,
  generateGroceryInput,
  groceryItemInput,
  groceryItemUpdate,
  groceryListInput,
  mealEntryInput,
  recipeInput,
  templateInput,
} from './schema';
import {
  addGroceryItem,
  applyTemplate,
  createGroceryList,
  createRecipe,
  generateGroceryListFromWeek,
  removeGroceryItem,
  removeGroceryList,
  removeMealEntry,
  removeRecipe,
  removeTemplate,
  saveTemplate,
  setGroceryItemPurchased,
  setGroceryListStatus,
  setMealEntry,
  setRecipeFavourite,
  updateGroceryItem,
  updateRecipe,
} from './service';

/** Meals and groceries also appear on the dashboard and weekly views. */
function refresh() {
  revalidatePath('/', 'layout');
}

const withId = z.object({ id: z.uuid() });

function fileFrom(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

// ───────────────────────────── Recipes ─────────────────────────────

export async function createRecipeAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = recipeInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const row = await createRecipe(user.id, parsed.data, fileFrom(formData, 'image'));
    refresh();
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function updateRecipeAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fromZodError(id.error);
    const parsed = recipeInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateRecipe(user.id, id.data.id, parsed.data, {
      image: fileFrom(formData, 'image'),
      removeImage: values.removeImage === true,
    });
    refresh();
    return ok({ id: id.data.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteRecipeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeRecipe(user.id, parsed.data.id);
  refresh();
  redirect('/meals/recipes');
}

export async function toggleRecipeFavouriteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.extend({ isFavourite: z.coerce.boolean() }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await setRecipeFavourite(user.id, parsed.data.id, parsed.data.isFavourite);
  refresh();
}

// ───────────────────────────── Meal plan ─────────────────────────────

export async function setMealEntryAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = mealEntryInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const prefs = await getPreferences(user.id);
    await setMealEntry(user.id, parsed.data, prefs.weekStartsOn);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function removeMealEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeMealEntry(user.id, parsed.data.id);
  refresh();
}

export async function saveTemplateAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = templateInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const prefs = await getPreferences(user.id);
    await saveTemplate(user.id, parsed.data, prefs.weekStartsOn);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function applyTemplateAction(
  _prev: ActionResult<{ applied: number }> | null,
  formData: FormData
): Promise<ActionResult<{ applied: number }>> {
  try {
    const user = await requireUser();
    const parsed = applyTemplateInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const prefs = await getPreferences(user.id);
    const applied = await applyTemplate(
      user.id,
      parsed.data.templateId,
      parsed.data.date,
      prefs.weekStartsOn
    );
    refresh();
    return ok({ applied });
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteTemplateAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeTemplate(user.id, parsed.data.id);
  refresh();
}

// ───────────────────────────── Groceries ─────────────────────────────

export async function generateGroceryListAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = generateGroceryInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const prefs = await getPreferences(user.id);
    const list = await generateGroceryListFromWeek(
      user.id,
      parsed.data.week,
      prefs.weekStartsOn,
      parsed.data.name
    );
    refresh();
    return ok({ id: list.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function createGroceryListAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = groceryListInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const list = await createGroceryList(user.id, parsed.data.name);
    refresh();
    return ok({ id: list.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function addGroceryItemAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = groceryItemInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await addGroceryItem(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function updateGroceryItemAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = groceryItemUpdate.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const { id, ...patch } = parsed.data;
    await updateGroceryItem(user.id, id, patch);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function toggleGroceryItemAction(
  id: string,
  isPurchased: boolean
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = withId.safeParse({ id });
    if (!parsed.success) return fail('That item does not exist.');
    await setGroceryItemPurchased(user.id, parsed.data.id, isPurchased);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteGroceryItemAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeGroceryItem(user.id, parsed.data.id);
  refresh();
}

export async function setGroceryListStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId
    .extend({ status: z.enum(['open', 'done']) })
    .safeParse(formValues(formData));
  if (!parsed.success) return;
  await setGroceryListStatus(user.id, parsed.data.id, parsed.data.status);
  refresh();
}

export async function deleteGroceryListAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeGroceryList(user.id, parsed.data.id);
  refresh();
  redirect('/groceries');
}
