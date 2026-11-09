'use client';

import { useActionState, useState, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import type { ActionResult } from '@/lib/action-result';
import { cn } from '@/lib/utils';
import { planTreatmentsAction, setTreatmentDoneAction } from '../actions';

/** Plan a treatment (mask, deep condition, nails…) on chosen days of the week. */
export function TreatmentPlanner({ weekDayKeys }: { weekDayKeys: string[] }) {
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => planTreatmentsAction(prev, formData),
    null
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FieldGroup className="gap-3">
        <Field data-invalid={hasFieldError(state, 'label')}>
          <FieldLabel htmlFor="treatment-label">Treatment</FieldLabel>
          <Input
            id="treatment-label"
            name="label"
            required
            maxLength={120}
            placeholder="Hair mask, nails, face mask"
          />
          <FieldError errors={fieldErrors(state, 'label')} />
        </Field>
        <Field data-invalid={hasFieldError(state, 'dates')}>
          <FieldLabel>Days this week</FieldLabel>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days this week">
            {weekDayKeys.map((key) => (
              <label
                key={key}
                className="bg-card has-[[data-checked]]:bg-secondary has-[[data-checked]]:text-secondary-foreground flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
              >
                <Checkbox name="dates[]" value={key} />
                {format(parseISO(key), 'EEE d')}
              </label>
            ))}
          </div>
          <FieldError errors={fieldErrors(state, 'dates')} />
        </Field>
      </FieldGroup>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingLabel="Planning…">
          Plan treatment
        </SubmitButton>
        {state?.ok && <span className="text-muted-foreground text-xs">Planned.</span>}
        {state && !state.ok && (
          <span role="alert" className="text-destructive text-sm">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

/** Done toggle for one planned treatment. */
export function TreatmentToggle({ id, done, label }: { id: string; done: boolean; label: string }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const value = optimistic ?? done;
  return (
    <Checkbox
      checked={value}
      disabled={pending}
      aria-label={value ? `Mark ${label} as not done` : `Mark ${label} as done`}
      className={cn(pending && 'opacity-60')}
      onCheckedChange={(checked) => {
        const next = checked === true;
        setOptimistic(next);
        start(async () => {
          const result = await setTreatmentDoneAction(id, next);
          if (!result.ok) setOptimistic(null);
        });
      }}
    />
  );
}
