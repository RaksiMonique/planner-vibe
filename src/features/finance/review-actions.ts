'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPreferences } from '@/features/settings/service';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import {
  createBudgetTask,
  ensureReviewReminder,
  finishReview,
  setMonthNote,
  setMonthSpending,
} from './review-service';
import { budgetTaskInput, finishReviewInput, reviewFigureInput, reviewNoteInput } from './schema';

const refresh = () => {
  revalidatePath('/finance/review');
  revalidatePath('/finance');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
};

async function context() {
  const user = await requireUser();
  const prefs = await getPreferences(user.id);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  return { userId: user.id, timeZone: prefs.timeZone, todayKey };
}

type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

function formAction<T>(
  schema: z.ZodType<T>,
  run: (ctx: Awaited<ReturnType<typeof context>>, data: T) => Promise<void>
): FormAction {
  return async (_prev, formData) => {
    try {
      const parsed = schema.safeParse(formValues(formData));
      if (!parsed.success) return fromZodError(parsed.error);
      await run(await context(), parsed.data);
      refresh();
      return ok(undefined);
    } catch (e) {
      return fromError(e);
    }
  };
}

export const setMonthSpendingAction = formAction(reviewFigureInput, async (ctx, data) => {
  await setMonthSpending(ctx.userId, data.id, data.month, data.amount, ctx.todayKey);
});

export const setMonthNoteAction = formAction(reviewNoteInput, async (ctx, data) => {
  await setMonthNote(ctx.userId, data.id, data.month, data.note, ctx.todayKey);
});

export const finishReviewAction = formAction(finishReviewInput, async (ctx, data) => {
  await finishReview(ctx.userId, data.month, {
    note: data.note,
    reset: data.reset,
    todayKey: ctx.todayKey,
  });
});

export const createBudgetTaskAction = formAction(budgetTaskInput, async (ctx, data) => {
  await createBudgetTask(ctx.userId, data, { timeZone: ctx.timeZone, todayKey: ctx.todayKey });
});

export async function setReviewReminderAction(): Promise<void> {
  const ctx = await context();
  await ensureReviewReminder(ctx.userId, { timeZone: ctx.timeZone, todayKey: ctx.todayKey });
  refresh();
}
