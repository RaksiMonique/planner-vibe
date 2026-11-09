'use client';

import { useActionState, useState } from 'react';
import { PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { SegmentSelect } from '@/features/life-segments/components/segment-select';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ActionResult } from '@/lib/action-result';
import { saveDevotionalAction } from '../actions';
import type { DevotionalEntry, ScriptureReference } from '../queries';

/** Today's devotional: shows the saved entry, or an inline form to add or edit it. */
export function DevotionalForm({
  dateKey,
  segments,
  defaultSegmentId,
  entry,
  compact = false,
}: {
  dateKey: string;
  segments: SegmentRef[];
  defaultSegmentId?: string;
  entry: (DevotionalEntry & { reference: ScriptureReference | null }) | null;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(entry === null && !compact);
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await saveDevotionalAction(prev, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    null
  );

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        {entry ? (
          <>
            <p className="font-heading text-lg">{entry.title}</p>
            {(entry.source || entry.reference) && (
              <p className="text-muted-foreground text-xs">
                {[entry.reference?.label, entry.source].filter(Boolean).join(' · ')}
              </p>
            )}
            {entry.reflection && (
              <p className="text-sm whitespace-pre-line italic">{entry.reflection}</p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">No devotional noted for today.</p>
        )}
        <div>
          <Button type="button" variant="outline" size="xs" onClick={() => setEditing(true)}>
            <PencilIcon data-icon="inline-start" />
            {entry ? 'Edit' : 'Add devotional'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="date" value={dateKey} />
      <FieldGroup className="gap-3">
        <Field data-invalid={hasFieldError(state, 'title')}>
          <FieldLabel htmlFor="devotional-title">Devotional</FieldLabel>
          <Input
            id="devotional-title"
            name="title"
            defaultValue={entry?.title ?? ''}
            required
            maxLength={200}
            placeholder="Nicodemus comes at night"
          />
          <FieldError errors={fieldErrors(state, 'title')} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'reference')}>
            <FieldLabel htmlFor="devotional-reference">Passage</FieldLabel>
            <Input
              id="devotional-reference"
              name="reference"
              defaultValue={entry?.reference?.label ?? ''}
              maxLength={60}
              placeholder="John 3:1-21"
            />
            <FieldError errors={fieldErrors(state, 'reference')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="devotional-source">Source</FieldLabel>
            <Input
              id="devotional-source"
              name="source"
              defaultValue={entry?.source ?? ''}
              maxLength={200}
              placeholder="Magnificat, Word Among Us…"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="devotional-segment">Life Segment</FieldLabel>
          <SegmentSelect
            id="devotional-segment"
            segments={segments}
            defaultValue={entry?.lifeSegmentId ?? defaultSegmentId}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="devotional-reflection">Reflection</FieldLabel>
          <Textarea
            id="devotional-reflection"
            name="reflection"
            rows={3}
            defaultValue={entry?.reflection ?? ''}
            placeholder="Where am I still coming to God only in the dark?"
          />
          <FieldDescription>Passage text is never stored; only the reference.</FieldDescription>
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <SubmitButton size="sm">Save devotional</SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
