'use client';

import { useActionState, useEffect, useRef } from 'react';
import { InboxIcon } from 'lucide-react';
import { addCaptureAction } from '../actions';

export function QuickCapture() {
  const [state, action, pending] = useActionState(addCaptureAction, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex w-full items-center gap-2 sm:w-auto">
      <label className="relative w-full sm:w-72">
        <InboxIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <input
          name="text"
          type="text"
          required
          maxLength={500}
          disabled={pending}
          placeholder="Quick capture… press Enter"
          aria-label="Quick capture"
          className="bg-card placeholder:text-muted-foreground focus-visible:ring-ring/50 h-8 w-full rounded-lg border pr-3 pl-8 text-sm outline-none focus-visible:ring-3"
        />
      </label>
      {state && !state.ok && <span className="text-destructive text-xs">{state.error}</span>}
    </form>
  );
}
