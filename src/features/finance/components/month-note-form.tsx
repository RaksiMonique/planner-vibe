'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { setMonthNoteAction } from '../review-actions';

/** One line about what happened in this budget this month. */
export function MonthNoteForm({
  budgetId,
  budgetName,
  month,
  note,
}: {
  budgetId: string;
  budgetName: string;
  month: string;
  note: string | null;
}) {
  const [state, action] = useActionState(setMonthNoteAction, null);
  const error = state && !state.ok ? (state.fieldErrors?.note?.[0] ?? state.error) : null;
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={budgetId} />
      <input type="hidden" name="month" value={month} />
      <div className="flex items-center gap-1">
        <Input
          name="note"
          defaultValue={note ?? ''}
          placeholder="What happened this month?"
          aria-label={`Note for ${budgetName}`}
          maxLength={1000}
          className="h-7 flex-1 text-xs"
        />
        <SubmitButton size="xs" variant="secondary" pendingLabel="Saving…">
          Save note
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
