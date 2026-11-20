'use client';

import { useActionState, useEffect, useRef } from 'react';
import { PlusIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { createBudgetTaskAction } from '../review-actions';

/** Leave yourself a task about this budget, once or every month. */
export function BudgetTaskForm({
  budgetId,
  budgetName,
  month,
  defaultDue,
}: {
  budgetId: string;
  budgetName: string;
  month: string;
  defaultDue: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(createBudgetTaskAction, null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  const error = state && !state.ok ? (state.fieldErrors?.title?.[0] ?? state.error) : null;
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1.5">
      <input type="hidden" name="id" value={budgetId} />
      <input type="hidden" name="month" value={month} />
      <div className="flex flex-wrap items-center gap-1.5">
        <Input
          name="title"
          required
          maxLength={200}
          placeholder="A task for next month…"
          aria-label={`New task for ${budgetName}`}
          className="h-7 min-w-40 flex-1 text-xs"
        />
        <Input
          name="dueDate"
          type="date"
          defaultValue={defaultDue}
          aria-label={`Due date for the ${budgetName} task`}
          className="h-7 w-36 text-xs"
        />
        <label className="flex items-center gap-1.5 text-xs">
          <Checkbox name="monthly" aria-label={`Repeat the ${budgetName} task every month`} />
          Every month
        </label>
        <SubmitButton size="xs" variant="outline" pendingLabel="Adding…">
          <PlusIcon data-icon="inline-start" />
          Add task
        </SubmitButton>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </form>
  );
}
