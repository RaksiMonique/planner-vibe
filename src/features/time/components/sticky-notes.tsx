'use client';

import { useActionState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ListPlusIcon, PinOffIcon, StickyNoteIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { addStickyAction, unpinCaptureAction } from '@/features/capture/actions';
import { cn } from '@/lib/utils';
import type { StickyNote } from '../service';

export function StickyNotes({
  stickies,
  defaultDate,
  onChanged,
}: {
  stickies: StickyNote[];
  /** yyyy-MM-dd the add form defaults to. */
  defaultDate: string;
  onChanged: () => void;
}) {
  const [state, action] = useActionState(addStickyAction, undefined);
  const handled = useRef<typeof state>(undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      formRef.current?.reset();
      onChanged();
    }
  }, [state, onChanged]);

  async function unpin(id: string) {
    const result = await unpinCaptureAction(id);
    if (result.ok) onChanged();
  }

  const byDate = new Map<string, StickyNote[]>();
  for (const s of stickies) {
    const list = byDate.get(s.pinnedDate) ?? [];
    list.push(s);
    byDate.set(s.pinnedDate, list);
  }

  return (
    <section className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <h3 className="font-heading flex items-center gap-2 text-lg">
        <StickyNoteIcon className="text-primary size-4" aria-hidden />
        Sticky notes
      </h3>
      <form ref={formRef} action={action} className="flex flex-col gap-2">
        <Input name="text" placeholder="Pin a note to a day…" aria-label="Sticky note" required />
        <div className="flex gap-2">
          <Input
            name="pinnedDate"
            type="date"
            defaultValue={defaultDate}
            aria-label="Day"
            className="flex-1"
            required
          />
          <SubmitButton size="sm" pendingLabel="Pinning…">
            Pin
          </SubmitButton>
        </div>
        {state && !state.ok && (
          <p role="alert" className="text-destructive text-xs">
            {state.error}
          </p>
        )}
      </form>
      {stickies.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing pinned to these days.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {[...byDate.entries()].map(([date, notes]) => (
            <li key={date} className="flex flex-col gap-1.5">
              <p className="tracking-eyebrow text-muted-foreground text-[11px] uppercase">
                {format(parseISO(date), 'EEEE d MMM')}
              </p>
              <ul className="flex flex-col gap-1.5">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="bg-blush flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1">{n.text}</span>
                    <Link
                      href="/tasks?new=1"
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon-xs' }))}
                      aria-label="Make a task"
                      title="Make a task"
                    >
                      <ListPlusIcon />
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Unpin"
                      title="Unpin (keeps it in the Inbox)"
                      onClick={() => unpin(n.id)}
                    >
                      <PinOffIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
