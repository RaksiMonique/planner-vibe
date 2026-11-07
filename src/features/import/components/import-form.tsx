'use client';

import { useActionState } from 'react';
import { UploadIcon } from 'lucide-react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { importLegacyAction } from '../actions';
import { ImportSummaryTable } from './import-summary';

export function ImportForm() {
  const [state, action] = useActionState(importLegacyAction, null);
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="legacy-file">JSON export from the old planner</FieldLabel>
          <Input
            id="legacy-file"
            name="file"
            type="file"
            accept=".json,application/json"
            required
          />
          <FieldDescription>
            Tasks, habits, goals, routines, Bible studies, studies, journal entries and quotes are
            imported. Recipes and meal plans are kept for Release 4. Importing the same file twice
            adds nothing.
          </FieldDescription>
        </Field>
        <div className="flex items-center gap-3">
          <SubmitButton size="sm" pendingLabel="Importing…">
            <UploadIcon data-icon="inline-start" />
            Import
          </SubmitButton>
          {state && !state.ok && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
        </div>
      </form>

      {state?.ok && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">Import finished.</p>
          <ImportSummaryTable summary={state.data} />
        </div>
      )}
    </div>
  );
}
