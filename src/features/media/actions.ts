'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPreferences } from '@/features/settings/service';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import {
  listItemInput,
  MEDIA_STATUSES,
  mediaItemInput,
  mediaListInput,
  mediaLogInput,
} from './schema';
import {
  addMediaLog,
  addToList,
  createMediaItem,
  createMediaList,
  removeFromList,
  removeMediaItem,
  removeMediaList,
  removeMediaLog,
  setMediaStatus,
  toggleFavourite,
  updateMediaItem,
} from './service';

function refresh() {
  revalidatePath('/media', 'layout');
  revalidatePath('/study');
}

const withId = z.object({ id: z.uuid() });
type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export const createMediaItemAction: FormAction = async (_prev, formData) => {
  try {
    const user = await requireUser();
    const parsed = mediaItemInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await createMediaItem(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
};

export const updateMediaItemAction: FormAction = async (_prev, formData) => {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fromZodError(id.error);
    const parsed = mediaItemInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateMediaItem(user.id, id.data.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
};

export async function setMediaStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.extend({ status: z.enum(MEDIA_STATUSES) }).safeParse(formValues(formData));
  if (!parsed.success) return;
  const prefs = await getPreferences(user.id);
  await setMediaStatus(
    user.id,
    parsed.data.id,
    parsed.data.status,
    toDateKey(todayInZone(prefs.timeZone))
  );
  refresh();
}

export async function toggleFavouriteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await toggleFavourite(user.id, parsed.data.id);
  refresh();
}

export async function deleteMediaItemAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeMediaItem(user.id, parsed.data.id);
  refresh();
}

export const addMediaLogAction: FormAction = async (_prev, formData) => {
  try {
    const user = await requireUser();
    const parsed = mediaLogInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await addMediaLog(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
};

export async function deleteMediaLogAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeMediaLog(user.id, parsed.data.id);
  refresh();
}

export const createMediaListAction: FormAction = async (_prev, formData) => {
  try {
    const user = await requireUser();
    const parsed = mediaListInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await createMediaList(user.id, parsed.data);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
};

export async function deleteMediaListAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeMediaList(user.id, parsed.data.id);
  refresh();
}

export async function addToListAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = listItemInput.safeParse(formValues(formData));
  if (!parsed.success) return;
  await addToList(user.id, parsed.data.listId, parsed.data.mediaItemId);
  refresh();
}

export async function removeFromListAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = listItemInput.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeFromList(user.id, parsed.data.listId, parsed.data.mediaItemId);
  refresh();
}
