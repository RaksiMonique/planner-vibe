'use client';

import { useActionState } from 'react';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ActionResult } from '@/lib/action-result';
import { deleteJournalEntryAction, saveJournalEntryAction } from '../actions';
import type { JournalEntry } from '../queries';
import { MoodPicker } from './mood-picker';

export function JournalDayEditor({
  dateKey,
  entry,
  segments,
  defaultSegmentId,
}: {
  dateKey: string;
  entry: JournalEntry | null;
  segments: SegmentRef[];
  defaultSegmentId: string;
}) {
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => saveJournalEntryAction(prev, formData),
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="kind" value="daily" />
      <input type="hidden" name="date" value={dateKey} />
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'title')}>
          <FieldLabel htmlFor="journal-title">Title</FieldLabel>
          <Input
            id="journal-title"
            name="title"
            defaultValue={entry?.title ?? ''}
            maxLength={160}
            placeholder="Optional"
          />
          <FieldError errors={fieldErrors(state, 'title')} />
        </Field>
        <Field data-invalid={hasFieldError(state, 'content')}>
          <FieldLabel htmlFor="journal-content">Today</FieldLabel>
          <Textarea
            id="journal-content"
            name="content"
            rows={10}
            defaultValue={entry?.content ?? ''}
            placeholder="What happened, what you noticed, what you want to remember."
            required
          />
          <FieldError errors={fieldErrors(state, 'content')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Mood</FieldLabel>
            <MoodPicker defaultValue={entry?.mood ?? null} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
            <FieldLabel htmlFor="journal-segment">Life Segment</FieldLabel>
            <SegmentSelect
              id="journal-segment"
              segments={segments}
              defaultValue={entry?.lifeSegmentId ?? defaultSegmentId}
            />
            <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
          </Field>
        </div>
      </FieldGroup>
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>{entry ? 'Save changes' : 'Save entry'}</SubmitButton>
        {state?.ok && <span className="text-muted-foreground text-xs">Saved.</span>}
        {state && !state.ok && (
          <span role="alert" className="text-destructive text-sm">
            {state.error}
          </span>
        )}
        {entry && (
          <div className="ml-auto">
            <ConfirmActionButton
              action={deleteJournalEntryAction}
              fields={{ id: entry.id }}
              title="Delete this entry?"
              description="The entry is removed from the journal."
              trigger="Delete"
              variant="ghost"
            />
          </div>
        )}
      </div>
    </form>
  );
}
