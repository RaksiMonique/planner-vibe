'use client';

import { useActionState } from 'react';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { addWellnessEntryAction } from '../actions';
import { CYCLE_LABELS, type WellnessKind } from '../schema';

/** An inline "log it" form whose fields depend on the kind of entry. */
export function WellnessLogForm({
  kind,
  dateKey,
  submitLabel = 'Log',
  className,
}: {
  kind: WellnessKind;
  dateKey: string;
  submitLabel?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => addWellnessEntryAction(prev, formData),
    null
  );
  const prefix = `log-${kind}`;

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="kind" value={kind} />
      <FieldGroup className="gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {kind === 'sleep' && (
            <Field data-invalid={hasFieldError(state, 'value')} className="w-28">
              <FieldLabel htmlFor={`${prefix}-value`}>Hours slept</FieldLabel>
              <Input
                id={`${prefix}-value`}
                name="value"
                type="number"
                inputMode="decimal"
                step="0.25"
                min={0}
                max={24}
                required
                placeholder="7.5"
              />
              <FieldError errors={fieldErrors(state, 'value')} />
            </Field>
          )}
          {kind === 'water' && (
            <Field data-invalid={hasFieldError(state, 'value')} className="w-28">
              <FieldLabel htmlFor={`${prefix}-value`}>Litres</FieldLabel>
              <Input
                id={`${prefix}-value`}
                name="value"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                max={20}
                required
                placeholder="0.5"
              />
              <FieldError errors={fieldErrors(state, 'value')} />
            </Field>
          )}
          {kind === 'fitness' && (
            <>
              <Field data-invalid={hasFieldError(state, 'label')} className="min-w-40 flex-1">
                <FieldLabel htmlFor={`${prefix}-label`}>Activity</FieldLabel>
                <Input
                  id={`${prefix}-label`}
                  name="label"
                  required
                  maxLength={120}
                  placeholder="Run, yoga, weights"
                />
                <FieldError errors={fieldErrors(state, 'label')} />
              </Field>
              <Field data-invalid={hasFieldError(state, 'value')} className="w-28">
                <FieldLabel htmlFor={`${prefix}-value`}>Minutes</FieldLabel>
                <Input
                  id={`${prefix}-value`}
                  name="value"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1440}
                  required
                  placeholder="30"
                />
                <FieldError errors={fieldErrors(state, 'value')} />
              </Field>
            </>
          )}
          {kind === 'self_care' && (
            <Field data-invalid={hasFieldError(state, 'label')} className="min-w-40 flex-1">
              <FieldLabel htmlFor={`${prefix}-label`}>What</FieldLabel>
              <Input
                id={`${prefix}-label`}
                name="label"
                required
                maxLength={120}
                placeholder="Bath, massage, walk"
              />
              <FieldError errors={fieldErrors(state, 'label')} />
            </Field>
          )}
          {kind === 'cycle' && (
            <Field data-invalid={hasFieldError(state, 'label')} className="w-44">
              <FieldLabel htmlFor={`${prefix}-label`}>Entry</FieldLabel>
              <NativeSelect id={`${prefix}-label`} name="label" defaultValue={CYCLE_LABELS[0]}>
                {CYCLE_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
              <FieldError errors={fieldErrors(state, 'label')} />
            </Field>
          )}
          <Field data-invalid={hasFieldError(state, 'date')} className="w-40">
            <FieldLabel htmlFor={`${prefix}-date`}>Date</FieldLabel>
            <Input id={`${prefix}-date`} name="date" type="date" defaultValue={dateKey} required />
            <FieldError errors={fieldErrors(state, 'date')} />
          </Field>
          {(kind === 'cycle' || kind === 'self_care') && (
            <Field className="min-w-40 flex-1">
              <FieldLabel htmlFor={`${prefix}-note`}>Note</FieldLabel>
              <Input id={`${prefix}-note`} name="note" maxLength={1000} placeholder="Optional" />
            </Field>
          )}
          <SubmitButton size="sm" pendingLabel="Logging…">
            {submitLabel}
          </SubmitButton>
        </div>
      </FieldGroup>
      {state?.ok && <p className="text-muted-foreground mt-2 text-xs">Logged.</p>}
      {state && !state.ok && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
