'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { GIFT_STATUSES, giftInput, recipientInput, wishlistInput } from './schema';
import {
  createGift,
  createRecipient,
  createWish,
  removeGift,
  removeRecipient,
  removeWish,
  setGiftStatus,
  setWishAcquired,
  updateGift,
  updateRecipient,
  updateWish,
} from './service';

const refresh = () => revalidatePath('/gifts');
const withId = z.object({ id: z.uuid() });
type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

function formAction<T>(
  schema: z.ZodType<T>,
  run: (userId: string, data: T, values: Record<string, unknown>) => Promise<void>
): FormAction {
  return async (_prev, formData) => {
    try {
      const user = await requireUser();
      const values = formValues(formData);
      const parsed = schema.safeParse(values);
      if (!parsed.success) return fromZodError(parsed.error);
      await run(user.id, parsed.data, values);
      refresh();
      return ok(undefined);
    } catch (e) {
      return fromError(e);
    }
  };
}

function idOf(values: Record<string, unknown>): string {
  const parsed = withId.safeParse(values);
  if (!parsed.success) throw new Error('Missing id.');
  return parsed.data.id;
}

export const createRecipientAction = formAction(recipientInput, (userId, data) =>
  createRecipient(userId, data).then(() => undefined)
);
export const updateRecipientAction = formAction(recipientInput, (userId, data, values) =>
  updateRecipient(userId, idOf(values), data)
);
export const createGiftAction = formAction(giftInput, (userId, data) =>
  createGift(userId, data).then(() => undefined)
);
export const updateGiftAction = formAction(giftInput, (userId, data, values) =>
  updateGift(userId, idOf(values), data)
);
export const createWishAction = formAction(wishlistInput, (userId, data) =>
  createWish(userId, data).then(() => undefined)
);
export const updateWishAction = formAction(wishlistInput, (userId, data, values) =>
  updateWish(userId, idOf(values), data)
);

export async function deleteRecipientAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeRecipient(user.id, parsed.data.id);
  refresh();
}

export async function setGiftStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.extend({ status: z.enum(GIFT_STATUSES) }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await setGiftStatus(user.id, parsed.data.id, parsed.data.status);
  refresh();
}

export async function deleteGiftAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeGift(user.id, parsed.data.id);
  refresh();
}

export async function setWishAcquiredAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId
    .extend({ acquired: z.coerce.boolean().default(false) })
    .safeParse(formValues(formData));
  if (!parsed.success) return;
  await setWishAcquired(user.id, parsed.data.id, parsed.data.acquired);
  refresh();
}

export async function deleteWishAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeWish(user.id, parsed.data.id);
  refresh();
}
