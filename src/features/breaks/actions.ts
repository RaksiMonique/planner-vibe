'use server';

import { revalidatePath } from 'next/cache';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { breakIdeaInput } from './schema';
import { addBreakIdea, addStarterBreakIdeas, removeBreakIdea } from './service';

/** Break ideas show beside the timer and the Pomodoro, which live under these routes. */
function refresh() {
  revalidatePath('/time');
  revalidatePath('/study', 'layout');
}

export type AddBreakIdeaState = ActionResult<{ id: string }> | null;

export async function addBreakIdeaAction(
  _prev: AddBreakIdeaState,
  formData: FormData
): Promise<AddBreakIdeaState> {
  try {
    const user = await requireUser();
    const parsed = breakIdeaInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const row = await addBreakIdea(user.id, parsed.data);
    refresh();
    return ok({ id: row.id });
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteBreakIdeaAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await removeBreakIdea(user.id, id);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function addStarterBreakIdeasAction(): Promise<ActionResult<{ created: number }>> {
  try {
    const user = await requireUser();
    const created = await addStarterBreakIdeas(user.id);
    refresh();
    return ok({ created });
  } catch (e) {
    return fromError(e);
  }
}
