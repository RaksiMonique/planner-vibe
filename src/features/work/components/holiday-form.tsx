'use client';

import { useActionState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { saveHolidayAction } from '../actions';

/** Inline "date + name" form; a second holiday on the same date renames the first. */
export function HolidayForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction] = useActionState(saveHolidayAction, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="grid grid-cols-[8.5rem_1fr] gap-2">
        <Input
          name="date"
          type="date"
          aria-label="Holiday date"
          defaultValue={defaultDate}
          required
        />
        <Input
          name="name"
          aria-label="Holiday name"
          placeholder="National Heroes Day"
          required
          maxLength={120}
        />
      </div>
      <div className="flex items-center gap-2">
        <SubmitButton size="sm" variant="outline" pendingLabel="Adding…">
          <PlusIcon data-icon="inline-start" />
          Add holiday
        </SubmitButton>
        {state && !state.ok && (
          <p role="alert" className="text-destructive text-xs">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
