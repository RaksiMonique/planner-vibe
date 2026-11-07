'use client';

import { useActionState } from 'react';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { updateProfileAction } from '../actions';
import { FormStatus } from './form-status';

export function ProfileForm({ email, displayName }: { email: string; displayName: string | null }) {
  const [state, action] = useActionState(updateProfileAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" value={email} readOnly disabled />
          <FieldDescription>Your sign-in email.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="displayName">Display name</FieldLabel>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={displayName ?? ''}
            placeholder="How the planner greets you"
          />
          <FieldError
            errors={
              state && !state.ok
                ? state.fieldErrors?.displayName?.map((message) => ({ message }))
                : undefined
            }
          />
        </Field>
      </FieldGroup>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm">Save profile</SubmitButton>
        <FormStatus state={state} savedText="Profile saved." />
      </div>
    </form>
  );
}
