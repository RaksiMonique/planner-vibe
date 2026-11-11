'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import type { SegmentRef } from '@/features/life-segments/types';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { createBudgetAction, updateBudgetAction } from '../actions';
import type { Budget } from '../queries';
import { BUDGET_PERIOD_LABELS, BUDGET_PERIODS } from '../schema';
import { DialogShell } from './dialog-shell';

type Props = {
  budget?: Budget;
  segments: SegmentRef[];
  /** The user's preference currency, the default for a new budget. */
  currency: string;
  defaultSegmentId?: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
};

export function BudgetFormDialog({ budget, trigger, variant, size, ...rest }: Props) {
  return (
    <DialogShell
      title={budget ? 'Edit budget' : 'Add a budget'}
      description="A limit for the month or the year. Record spending by hand as it happens."
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => <BudgetForm budget={budget} close={close} {...rest} />}
    </DialogShell>
  );
}

function BudgetForm({
  budget,
  segments,
  currency,
  defaultSegmentId,
  close,
}: Omit<Props, 'trigger' | 'variant' | 'size'> & { close: () => void }) {
  const action = budget ? updateBudgetAction : createBudgetAction;
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  const segmentId = budget?.lifeSegmentId ?? defaultSegmentId ?? segments[0]?.id ?? '';
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {budget && <input type="hidden" name="id" value={budget.id} />}
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'name')}>
          <FieldLabel htmlFor="budget-name">Name</FieldLabel>
          <Input
            id="budget-name"
            name="name"
            defaultValue={budget?.name}
            required
            maxLength={120}
            autoFocus
            placeholder="Groceries"
          />
          <FieldError errors={fieldErrors(state, 'name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="budget-category">Category</FieldLabel>
            <Input
              id="budget-category"
              name="category"
              defaultValue={budget?.category ?? ''}
              maxLength={80}
              placeholder="Household, giving, fun"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="budget-period">Period</FieldLabel>
            <NativeSelect
              id="budget-period"
              name="period"
              defaultValue={budget?.period ?? 'monthly'}
            >
              {BUDGET_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {BUDGET_PERIOD_LABELS[p]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field data-invalid={hasFieldError(state, 'lifeSegmentId')}>
          <FieldLabel htmlFor="budget-segment">Life Segment</FieldLabel>
          <NativeSelect id="budget-segment" name="lifeSegmentId" defaultValue={segmentId} required>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError errors={fieldErrors(state, 'lifeSegmentId')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={hasFieldError(state, 'limitAmount')}>
            <FieldLabel htmlFor="budget-limit">Limit</FieldLabel>
            <Input
              id="budget-limit"
              name="limitAmount"
              type="number"
              inputMode="decimal"
              min={0.01}
              step="0.01"
              required
              defaultValue={budget?.limitAmount ?? ''}
            />
            <FieldError errors={fieldErrors(state, 'limitAmount')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'spentAmount')}>
            <FieldLabel htmlFor="budget-spent">Spent so far</FieldLabel>
            <Input
              id="budget-spent"
              name="spentAmount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              defaultValue={budget?.spentAmount ?? ''}
              placeholder="0.00"
            />
            <FieldError errors={fieldErrors(state, 'spentAmount')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'currency')}>
            <FieldLabel htmlFor="budget-currency">Currency</FieldLabel>
            <Input
              id="budget-currency"
              name="currency"
              defaultValue={budget?.currency ?? currency}
              maxLength={3}
              minLength={3}
              autoCapitalize="characters"
              className="uppercase"
            />
            <FieldError errors={fieldErrors(state, 'currency')} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="budget-note">Note</FieldLabel>
          <Textarea id="budget-note" name="note" rows={2} defaultValue={budget?.note ?? ''} />
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{budget ? 'Save changes' : 'Add budget'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
