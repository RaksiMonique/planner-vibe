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
import { parseFields } from './kinds';
import { recordInput } from './schema';
import { createRecord, removeRecord, updateRecord } from './service';

const withId = z.object({ id: z.uuid() });

function refresh() {
  revalidatePath('/important');
}

export async function createRecordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const parsed = recordInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    const { fields, errors } = parseFields(parsed.data.kind, values);
    if (Object.keys(errors).length > 0) return fail('Some fields are missing.', errors);
    await createRecord(user.id, parsed.data, fields);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function updateRecordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fail('That record is missing.');
    const parsed = recordInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    const { fields, errors } = parseFields(parsed.data.kind, values);
    if (Object.keys(errors).length > 0) return fail('Some fields are missing.', errors);
    await updateRecord(user.id, id.data.id, parsed.data, fields);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function removeRecordAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeRecord(user.id, parsed.data.id);
  refresh();
}
