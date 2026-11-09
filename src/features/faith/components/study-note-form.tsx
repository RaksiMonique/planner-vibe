'use client';

import { useActionState, useRef } from 'react';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import type { ActionResult } from '@/lib/action-result';
import { addStudyNoteAction } from '../actions';

export function StudyNoteForm({ studyId }: { studyId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await addStudyNoteAction(prev, formData);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    null
  );
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="studyId" value={studyId} />
      <FieldGroup className="gap-3">
        <Field data-invalid={hasFieldError(state, 'content')}>
          <FieldLabel htmlFor="note-content">Note</FieldLabel>
          <Textarea
            id="note-content"
            name="content"
            rows={3}
            required
            placeholder="What stood out, questions, connections…"
          />
          <FieldError errors={fieldErrors(state, 'content')} />
        </Field>
        <Field data-invalid={hasFieldError(state, 'reference')}>
          <FieldLabel htmlFor="note-reference">Passage</FieldLabel>
          <Input id="note-reference" name="reference" maxLength={60} placeholder="John 3:1-21" />
          <FieldDescription>Optional. Typed like 1 Cor 13 or Ps 23:1.</FieldDescription>
          <FieldError errors={fieldErrors(state, 'reference')} />
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div>
        <SubmitButton size="sm" pendingLabel="Adding…">
          Add note
        </SubmitButton>
      </div>
    </form>
  );
}
