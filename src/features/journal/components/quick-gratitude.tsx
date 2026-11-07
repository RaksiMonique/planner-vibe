'use client';

import { useActionState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import type { ActionResult } from '@/lib/action-result';
import { quickGratitudeAction } from '../actions';

/** One-line gratitude add for the dashboard. */
export function QuickGratitude({ dateKey }: { dateKey: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await quickGratitudeAction(prev, formData);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    null
  );
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="date" value={dateKey} />
      <div className="flex gap-2">
        <Input
          name="content"
          aria-label="Grateful for"
          placeholder="Grateful for…"
          maxLength={500}
          required
        />
        <SubmitButton size="sm" variant="outline" pendingLabel="Adding…">
          Add
        </SubmitButton>
      </div>
      {state && !state.ok && (
        <span role="alert" className="text-destructive text-xs">
          {state.error}
        </span>
      )}
    </form>
  );
}
