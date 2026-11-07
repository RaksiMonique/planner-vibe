'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getPreferences } from '@/features/settings/service';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { answersFromValues, autosaveInput, openReviewInput, saveReviewInput } from './schema';
import { openReview, removeReview, saveAnswers } from './service';

/** Opens (creating if needed) the review for a period or goal, then goes to it. */
export async function openReviewAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = openReviewInput.safeParse(formValues(formData));
  if (!parsed.success) redirect('/reviews?error=invalid');
  const prefs = await getPreferences(user.id);
  const review = await openReview(user.id, parsed.data, prefs);
  revalidatePath('/reviews');
  redirect(`/reviews/${review.id}`);
}

export async function saveReviewAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const parsed = saveReviewInput.safeParse(values);
    if (!parsed.success) return fromZodError(parsed.error);
    await saveAnswers(user.id, parsed.data.id, answersFromValues(values), {
      summary: parsed.data.summary ?? '',
      complete: parsed.data.complete === undefined ? undefined : parsed.data.complete === '1',
    });
    revalidatePath('/reviews');
    revalidatePath(`/reviews/${parsed.data.id}`);
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

/** Autosave of one answer on blur. No revalidation, so typing is not interrupted. */
export async function autosaveReviewAnswer(
  id: string,
  promptId: string,
  value: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = autosaveInput.safeParse({ id, promptId, value });
    if (!parsed.success) return fromZodError(parsed.error);
    await saveAnswers(user.id, parsed.data.id, { [parsed.data.promptId]: parsed.data.value });
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function deleteReviewAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = z.object({ id: z.uuid() }).safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeReview(user.id, parsed.data.id);
  revalidatePath('/reviews');
  redirect('/reviews');
}
