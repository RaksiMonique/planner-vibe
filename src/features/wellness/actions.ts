'use server';

import { revalidatePath } from 'next/cache';
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
import {
  dateKeyValue,
  moodInput,
  productInput,
  treatmentPlanInput,
  wellnessEntryInput,
  wellnessJournalInput,
} from './schema';
import {
  addWellnessEntry,
  createProduct,
  planTreatments,
  removeMood,
  removeProduct,
  removeWellnessEntry,
  saveMood,
  saveWellnessJournal,
  setProductFlag,
  setTreatmentDone,
  updateProduct,
  updateWellnessEntry,
} from './service';

/** Wellness shows on the dashboard and the weekly and monthly views. */
function refresh() {
  revalidatePath('/', 'layout');
}

const withId = z.object({ id: z.uuid() });

export async function saveMoodAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = moodInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await saveMood(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

/** Dashboard quick pick: both scales in one call. */
export async function saveMoodQuick(
  dateKey: string,
  mood: number,
  energy: number
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = moodInput.safeParse({ date: dateKey, mood, energy });
    if (!parsed.success) return fromZodError(parsed.error);
    await saveMood(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function removeMoodAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = z.object({ date: dateKeyValue }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeMood(user.id, parsed.data.date);
  refresh();
}

export async function addWellnessEntryAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = wellnessEntryInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await addWellnessEntry(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function updateWellnessEntryAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fail('That entry is missing.');
    const parsed = wellnessEntryInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateWellnessEntry(user.id, id.data.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function removeWellnessEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeWellnessEntry(user.id, parsed.data.id);
  refresh();
}

export async function planTreatmentsAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const parsed = treatmentPlanInput.safeParse({
      ...values,
      dates: Array.isArray(values.dates) ? values.dates : values.dates ? [values.dates] : [],
    });
    if (!parsed.success) return fromZodError(parsed.error);
    await planTreatments(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function setTreatmentDoneAction(id: string, done: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = withId.safeParse({ id });
    if (!parsed.success) return fail('That treatment is missing.');
    await setTreatmentDone(user.id, parsed.data.id, done);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

function imageFrom(formData: FormData): File | null {
  const file = formData.get('image');
  return file instanceof File && file.size > 0 ? file : null;
}

export async function createProductAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = productInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await createProduct(user.id, parsed.data, imageFrom(formData));
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function updateProductAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fail('That product is missing.');
    const parsed = productInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateProduct(user.id, id.data.id, parsed.data, imageFrom(formData));
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function setProductFlagAction(
  id: string,
  flag: 'inInventory' | 'isFavourite' | 'onWishlist',
  value: boolean
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = withId.safeParse({ id });
    if (!parsed.success) return fail('That product is missing.');
    await setProductFlag(user.id, parsed.data.id, flag, value);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function removeProductAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeProduct(user.id, parsed.data.id);
  refresh();
}

export async function saveWellnessJournalAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = wellnessJournalInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await saveWellnessJournal(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}
