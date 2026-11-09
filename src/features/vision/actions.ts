'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { boardInput, captionInput, itemInput } from './schema';
import {
  addItem,
  clearBoardCover,
  createBoard,
  moveItem,
  removeBoard,
  removeItem,
  updateBoard,
  updateCaption,
} from './service';

const refresh = () => revalidatePath('/vision-boards', 'layout');
const withId = z.object({ id: z.uuid() });
type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

const fileOf = (formData: FormData, name: string): File | null => {
  const f = formData.get(name);
  return f instanceof File && f.size > 0 ? f : null;
};

export const createBoardAction: FormAction = async (_prev, formData) => {
  try {
    const user = await requireUser();
    const parsed = boardInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await createBoard(user.id, parsed.data, fileOf(formData, 'cover'));
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
};

export const updateBoardAction: FormAction = async (_prev, formData) => {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const id = withId.safeParse(values);
    if (!id.success) return fromZodError(id.error);
    const parsed = boardInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await updateBoard(user.id, id.data.id, parsed.data, fileOf(formData, 'cover'));
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
};

export async function clearBoardCoverAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await clearBoardCover(user.id, parsed.data.id);
  refresh();
}

export async function deleteBoardAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeBoard(user.id, parsed.data.id);
  refresh();
  redirect('/vision-boards');
}

export const addItemAction: FormAction = async (_prev, formData) => {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const board = z.object({ boardId: z.uuid() }).safeParse(values);
    if (!board.success) return fromZodError(board.error);
    const parsed = itemInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await addItem(user.id, board.data.boardId, parsed.data, fileOf(formData, 'image'));
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
};

export const updateCaptionAction: FormAction = async (_prev, formData) => {
  try {
    const user = await requireUser();
    const parsed = captionInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await updateCaption(user.id, parsed.data.id, parsed.data.caption);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
};

export async function moveItemAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId
    .extend({ direction: z.enum(['left', 'right']) })
    .safeParse(formValues(formData));
  if (!parsed.success) return;
  await moveItem(user.id, parsed.data.id, parsed.data.direction);
  refresh();
}

export async function deleteItemAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeItem(user.id, parsed.data.id);
  refresh();
}
