'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import type { ActionResult } from '@/lib/action-result';
import { saveGratitudeAction } from '../actions';
import type { JournalEntry } from '../queries';
import { gratitudeLines } from '../schema';

/** Three quick lines of gratitude for the day, saved as one entry. */
export function GratitudeList({
  dateKey,
  entry,
  defaultSegmentId,
}: {
  dateKey: string;
  entry: JournalEntry | null;
  defaultSegmentId: string;
}) {
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => saveGratitudeAction(prev, formData),
    null
  );
  const lines = gratitudeLines(entry?.content);
  const slots = Math.max(3, lines.length);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="date" value={dateKey} />
      <input type="hidden" name="lifeSegmentId" value={entry?.lifeSegmentId ?? defaultSegmentId} />
      <ol className="flex flex-col gap-2">
        {Array.from({ length: slots }, (_, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground w-4 text-right text-xs tabular-nums">
              {i + 1}.
            </span>
            <Input
              name="lines[]"
              defaultValue={lines[i] ?? ''}
              aria-label={`Gratitude ${i + 1}`}
              placeholder={i === 0 ? 'Something you are grateful for today' : ''}
              maxLength={500}
            />
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2">
        <SubmitButton size="sm" variant="outline">
          Save gratitude
        </SubmitButton>
        {state?.ok && <span className="text-muted-foreground text-xs">Saved.</span>}
        {state && !state.ok && (
          <span role="alert" className="text-destructive text-sm">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
