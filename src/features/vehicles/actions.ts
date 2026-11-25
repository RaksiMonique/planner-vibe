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
import { documentInput, vehicleInput } from './schema';
import {
  createVehicle,
  removeDocument,
  removeVehicle,
  saveDocument,
  updateVehicle,
} from './service';

const withId = z.object({ id: z.uuid() });

/** The dashboard card and the notification feed read these too. */
function refresh() {
  revalidatePath('/', 'layout');
}

export async function createVehicleAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = vehicleInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await createVehicle(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function updateVehicleAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fail('That vehicle is missing.');
    const parsed = vehicleInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateVehicle(user.id, id.data.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteVehicleAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeVehicle(user.id, parsed.data.id);
  refresh();
}

/** Creates a document, or updates the one named by a hidden `id`. */
export async function saveDocumentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = typeof values.id === 'string' ? withId.safeParse(values) : null;
    if (id && !id.success) return fail('That document is missing.');
    const parsed = documentInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await saveDocument(user.id, parsed.data, id?.data.id);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeDocument(user.id, parsed.data.id);
  refresh();
}
