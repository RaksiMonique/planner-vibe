'use client';

import { useActionState } from 'react';
import { MODULE_KEYS, type EnabledModules } from '@/db/schema';
import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { SubmitButton } from '@/components/shared/submit-button';
import { updateModulesAction } from '../actions';
import { MODULE_LABELS } from '../schema';
import { FormStatus } from './form-status';

export function ModulesForm({ enabled }: { enabled: EnabledModules }) {
  const [state, action] = useActionState(updateModulesAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Switched-off modules disappear from navigation and the dashboard. Their data is kept.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {MODULE_KEYS.map((key) => (
          <Field key={key} orientation="horizontal">
            <Switch
              id={`module-${key}`}
              name={`module:${key}`}
              defaultChecked={enabled[key] ?? true}
            />
            <FieldLabel htmlFor={`module-${key}`} className="font-normal">
              {MODULE_LABELS[key]}
            </FieldLabel>
          </Field>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm">Save modules</SubmitButton>
        <FormStatus state={state} savedText="Modules saved." />
      </div>
    </form>
  );
}
