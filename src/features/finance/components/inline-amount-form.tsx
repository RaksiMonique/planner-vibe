'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import type { ActionResult } from '@/lib/action-result';
import { cn } from '@/lib/utils';

/**
 * A one-field form that posts an amount for a row: record spending on a budget
 * or update the measured value of a goal. The field is cleared after a
 * successful submit unless `keepValue` is set.
 */
export function InlineAmountForm({
  action,
  id,
  name,
  label,
  submitLabel,
  defaultValue,
  placeholder = '0.00',
  min = 0,
  keepValue = false,
  className,
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  id: string;
  name: string;
  /** Accessible name of the field, for example "Record spending for Groceries". */
  label: string;
  submitLabel: string;
  defaultValue?: string;
  placeholder?: string;
  min?: number;
  keepValue?: boolean;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(action, null);
  useEffect(() => {
    if (state?.ok && !keepValue) formRef.current?.reset();
  }, [state, keepValue]);
  const error = state && !state.ok ? (state.fieldErrors?.[name]?.[0] ?? state.error) : null;
  return (
    <form ref={formRef} action={formAction} className={cn('flex flex-col gap-1', className)}>
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-1">
        <Input
          name={name}
          type="number"
          inputMode="decimal"
          min={min}
          step="0.01"
          required
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          className="h-7 w-28 text-xs"
        />
        <SubmitButton size="xs" variant="secondary" pendingLabel="Saving…">
          {submitLabel}
        </SubmitButton>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </form>
  );
}
