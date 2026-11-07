'use client';

import { useActionState, useRef, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { FlagIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import type { ActionResult } from '@/lib/action-result';
import { cn } from '@/lib/utils';
import { createMilestoneAction, removeMilestoneAction, toggleMilestoneAction } from '../actions';
import type { Milestone } from '../service';

function withId(id: string) {
  const fd = new FormData();
  fd.set('id', id);
  return fd;
}

/** Milestones of one goal or project: toggle, remove, inline add. */
export function MilestoneList({
  milestones,
  goalId,
  projectId,
  todayKey,
}: {
  milestones: Milestone[];
  goalId?: string;
  projectId?: string;
  todayKey: string;
}) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await createMilestoneAction(prev, formData);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    null
  );
  const done = milestones.filter((m) => m.completedAt).length;

  return (
    <div className="flex flex-col gap-3">
      {milestones.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {done} of {milestones.length} reached
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {milestones.map((m) => {
          const reached = !!m.completedAt;
          const overdue = !reached && m.dueDate !== null && m.dueDate < todayKey;
          return (
            <li
              key={m.id}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm',
                pending && 'opacity-70'
              )}
            >
              <Checkbox
                checked={reached}
                aria-label={reached ? `Reopen ${m.title}` : `Mark ${m.title} reached`}
                onCheckedChange={() =>
                  startTransition(async () => {
                    await toggleMilestoneAction(withId(m.id));
                  })
                }
              />
              <FlagIcon className="text-primary size-3.5" aria-hidden />
              <span
                className={cn(
                  'min-w-0 flex-1 truncate',
                  reached && 'text-muted-foreground line-through'
                )}
              >
                {m.title}
              </span>
              {m.dueDate && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    overdue ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {format(parseISO(m.dueDate), 'd MMM yyyy')}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${m.title}`}
                onClick={() =>
                  startTransition(async () => {
                    await removeMilestoneAction(withId(m.id));
                  })
                }
              >
                <Trash2Icon />
              </Button>
            </li>
          );
        })}
      </ul>
      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
        {goalId && <input type="hidden" name="goalId" value={goalId} />}
        {projectId && <input type="hidden" name="projectId" value={projectId} />}
        <Input
          name="title"
          placeholder="Add a milestone"
          aria-label="Milestone title"
          required
          maxLength={140}
          className="min-w-40 flex-1"
        />
        <Input type="date" name="dueDate" aria-label="Milestone due date" className="w-40" />
        <SubmitButton size="sm" variant="outline" pendingLabel="Adding…">
          Add
        </SubmitButton>
      </form>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.fieldErrors?.title?.[0] ?? state.error}
        </p>
      )}
    </div>
  );
}
