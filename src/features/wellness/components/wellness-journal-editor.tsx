'use client';

import { useActionState } from 'react';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import type { ActionResult } from '@/lib/action-result';
import { saveWellnessJournalAction } from '../actions';
import type { WellnessJournalScope } from '../schema';

const PROMPTS: Record<WellnessJournalScope, string> = {
  daily: 'How did your body and mind feel today? Sleep, food, movement, stress.',
  weekly: 'Looking at the week: what helped, what drained you, what to repeat.',
  monthly:
    'The month as a whole: patterns in energy, sleep and care, and one change for next month.',
};

export function WellnessJournalEditor({
  scope,
  dateKey,
  entry,
}: {
  scope: WellnessJournalScope;
  dateKey: string;
  entry: { id: string; content: string } | null;
}) {
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) =>
      saveWellnessJournalAction(prev, formData),
    null
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="date" value={dateKey} />
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'content')}>
          <FieldLabel htmlFor="wellness-journal-content">Entry</FieldLabel>
          <Textarea
            id="wellness-journal-content"
            name="content"
            rows={8}
            required
            maxLength={20_000}
            key={`${scope}:${dateKey}:${entry?.id ?? 'new'}`}
            defaultValue={entry?.content ?? ''}
            placeholder={PROMPTS[scope]}
          />
          <FieldError errors={fieldErrors(state, 'content')} />
        </Field>
      </FieldGroup>
      <div className="flex items-center gap-3">
        <SubmitButton>{entry ? 'Save changes' : 'Save entry'}</SubmitButton>
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
