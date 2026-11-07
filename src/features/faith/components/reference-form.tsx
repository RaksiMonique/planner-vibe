'use client';

import { useActionState, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import type { ActionResult } from '@/lib/action-result';
import { addReferenceAction } from '../actions';

export function ReferenceForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await addReferenceAction(prev, formData);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    null
  );
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <FieldGroup className="gap-2">
        <Field data-invalid={hasFieldError(state, 'reference')}>
          <FieldLabel htmlFor="reference-text">Save a passage</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="reference-text"
              name="reference"
              required
              maxLength={60}
              placeholder="Phil 4:6-7"
              className="flex-1"
            />
            <SubmitButton size="sm" pendingLabel="Saving…">
              Save
            </SubmitButton>
          </div>
          <FieldError errors={fieldErrors(state, 'reference')} />
        </Field>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox name="isFavourite" defaultChecked />
            Favourite verse
          </label>
          <label className="flex items-center gap-2">
            <Checkbox name="isBookmark" />
            Bookmark
          </label>
        </div>
        <Input name="note" maxLength={200} placeholder="Why it matters (optional)" />
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
