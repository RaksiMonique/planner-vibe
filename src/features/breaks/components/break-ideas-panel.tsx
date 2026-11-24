'use client';

import { useActionState, useCallback, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CoffeeIcon, FootprintsIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { addBreakIdeaAction, deleteBreakIdeaAction } from '../actions';
import type { BreakIdeaView } from '../schema';
import { StarterIdeasButton } from './starter-ideas-button';

export type BreakHabitOption = { id: string; name: string };

/** The list of things to do on a break, and the form that grows it. */
export function BreakIdeasPanel({
  ideas,
  habits,
  onChanged,
}: {
  ideas: BreakIdeaView[];
  habits: BreakHabitOption[];
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [state, action] = useActionState(addBreakIdeaAction, null);
  const [pending, startTransition] = useTransition();
  const handled = useRef<typeof state>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const changed = useCallback(() => {
    if (onChanged) onChanged();
    else router.refresh();
  }, [onChanged, router]);
  const habitName = new Map(habits.map((h) => [h.id, h.name]));

  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      formRef.current?.reset();
      changed();
    }
  }, [state, changed]);

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteBreakIdeaAction(id);
      if (result.ok) changed();
    });
  }

  return (
    <section className="bg-card flex flex-col gap-3 rounded-xl border p-4" data-slot="break-ideas">
      <h3 className="font-heading flex items-center gap-2 text-lg">
        <CoffeeIcon className="text-primary size-4" aria-hidden />
        Break ideas
      </h3>

      <form ref={formRef} action={action} className="flex flex-col gap-2">
        <Input
          name="title"
          placeholder="Something to do instead of scrolling…"
          aria-label="Break idea"
          required
          maxLength={80}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isMovement" className="accent-primary size-4" />
          Gets me moving
        </label>
        {habits.length > 0 && (
          <NativeSelect name="habitId" aria-label="Counts for a habit" defaultValue="">
            <option value="">Not tied to a habit</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <SubmitButton size="sm" variant="outline" pendingLabel="Adding…">
          Add idea
        </SubmitButton>
        {state && !state.ok && (
          <p role="alert" className="text-destructive text-xs">
            {state.fieldErrors?.title?.[0] ?? state.error}
          </p>
        )}
      </form>

      {ideas.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">
            No break ideas yet. Start with a few and change them as you learn what helps.
          </p>
          <StarterIdeasButton onChanged={changed} />
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {ideas.map((idea) => (
            <li key={idea.id} className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm">
              {idea.isMovement ? (
                <FootprintsIcon
                  className="text-primary size-4 shrink-0"
                  aria-label="Gets you moving"
                />
              ) : (
                <span className="size-4 shrink-0" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate">{idea.title}</span>
              {idea.habitId && habitName.has(idea.habitId) && (
                <span className="text-muted-foreground max-w-24 truncate text-xs">
                  {habitName.get(idea.habitId)}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete ${idea.title}`}
                disabled={pending}
                onClick={() => remove(idea.id)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
