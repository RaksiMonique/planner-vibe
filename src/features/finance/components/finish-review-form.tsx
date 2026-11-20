'use client';

import { useActionState } from 'react';
import { CheckIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { finishReviewAction } from '../review-actions';

export function FinishReviewForm({
  month,
  note,
  done,
  resetDefault,
}: {
  month: string;
  note: string | null;
  done: boolean;
  /** Whether the live counters should go back to zero when this is finished. */
  resetDefault: boolean;
}) {
  const [state, action] = useActionState(finishReviewAction, null);
  const error = state && !state.ok ? state.error : null;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="month" value={month} />
      <label className="flex flex-col gap-1 text-sm">
        How did the month go?
        <Textarea
          name="note"
          defaultValue={note ?? ''}
          rows={3}
          maxLength={5000}
          placeholder="Where the money went, what to change, what to keep."
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox name="reset" defaultChecked={resetDefault} />
        <span>
          Start the new month
          <span className="text-muted-foreground block text-xs">
            Sets every monthly budget&apos;s spending back to zero. The figures above stay on record
            for this month.
          </span>
        </span>
      </label>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-muted-foreground text-xs">
          Saved.
        </p>
      )}
      <div>
        <SubmitButton pendingLabel="Saving…">
          <CheckIcon data-icon="inline-start" />
          {done ? 'Update review' : 'Finish review'}
        </SubmitButton>
      </div>
    </form>
  );
}
