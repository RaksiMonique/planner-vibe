'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { updateGoalProgress } from '@/features/goals/service';
import { getPreferences } from '@/features/settings/service';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth';
import { budgetInput, goalProgressInput, spendingInput } from './schema';
import {
  createBudget,
  recordSpending,
  removeBudget,
  resetBudgetPeriod,
  updateBudget,
} from './service';

const refresh = () => {
  revalidatePath('/finance');
  revalidatePath('/dashboard');
};
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

export const createBudgetAction = formAction(budgetInput, async (userId, data) => {
  const prefs = await getPreferences(userId);
  await createBudget(userId, data, prefs.currency);
});

export const updateBudgetAction = formAction(budgetInput, async (userId, data, values) => {
  const prefs = await getPreferences(userId);
  await updateBudget(userId, idOf(values), data, prefs.currency);
});

export const recordSpendingAction = formAction(spendingInput, async (userId, data) => {
  await recordSpending(userId, data.id, data.amount);
});

export const updateGoalProgressAction = formAction(goalProgressInput, async (userId, data) => {
  await updateGoalProgress(userId, data.id, data.currentValue);
  revalidatePath('/goals', 'layout');
});

export async function resetBudgetAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await resetBudgetPeriod(user.id, parsed.data.id);
  refresh();
}

export async function deleteBudgetAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = withId.safeParse(formValues(formData));
  if (!parsed.success) return;
  await removeBudget(user.id, parsed.data.id);
  refresh();
}
