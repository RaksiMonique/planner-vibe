'use client';

import { useActionState, useOptimistic, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { cn } from '@/lib/utils';
import {
  addPlanItemAction,
  deletePlanItemAction,
  movePlanItemAction,
  setPlanItemDoneAction,
} from '../actions';
import { nextPlanItem } from '../links';
import type { HabitPlanItem } from '../queries';

/**
 * The habit's queue of what to do next. Ticking an item off also checks the
 * habit in for today. Dated items surface on their day; the rest run in order.
 */
export function HabitPlan({
  habitId,
  items,
  todayKey,
}: {
  habitId: string;
  items: HabitPlanItem[];
  todayKey: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    items,
    (current, update: { id: string; done: boolean }) =>
      current.map((i) =>
        i.id === update.id ? { ...i, completedAt: update.done ? new Date() : null } : i
      )
  );
  const [state, formAction] = useActionState(addPlanItemAction, null);
  const next = nextPlanItem(optimistic, todayKey);
  const open = optimistic.filter((i) => i.completedAt === null);
  const done = optimistic.filter((i) => i.completedAt !== null);

  function toggle(id: string, value: boolean) {
    startTransition(async () => {
      setOptimistic({ id, done: value });
      await setPlanItemDoneAction(id, value);
    });
  }

  function row(item: HabitPlanItem, index: number, count: number) {
    const isDone = item.completedAt !== null;
    const isNext = next?.id === item.id;
    const late = !isDone && item.plannedDate !== null && item.plannedDate < todayKey;
    return (
      <li
        key={item.id}
        className={cn(
          'flex items-center gap-2 rounded-lg px-1 py-1 text-sm',
          isNext && 'bg-primary/5 ring-primary/20 ring-1'
        )}
        data-next={isNext || undefined}
      >
        <Checkbox
          checked={isDone}
          onCheckedChange={(checked) => toggle(item.id, checked === true)}
          aria-label={`${isDone ? 'Reopen' : 'Done'}: ${item.title}`}
        />
        <span
          className={cn('min-w-0 flex-1 truncate', isDone && 'text-muted-foreground line-through')}
        >
          {item.title}
        </span>
        {isNext && (
          <span className="text-primary text-xs font-medium tracking-wide uppercase">Next</span>
        )}
        {item.plannedDate && (
          <span className={cn('text-xs', late ? 'text-destructive' : 'text-muted-foreground')}>
            {format(parseISO(item.plannedDate), 'EEE d MMM')}
          </span>
        )}
        {!isDone && (
          <>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={`Move up: ${item.title}`}
              disabled={pending || index === 0}
              onClick={() =>
                startTransition(() => movePlanItemAction(item.id, 'up').then(() => {}))
              }
            >
              <ArrowUpIcon />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={`Move down: ${item.title}`}
              disabled={pending || index === count - 1}
              onClick={() =>
                startTransition(() => movePlanItemAction(item.id, 'down').then(() => {}))
              }
            >
              <ArrowDownIcon />
            </Button>
          </>
        )}
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Remove: ${item.title}`}
          disabled={pending}
          onClick={() => startTransition(() => deletePlanItemAction(item.id).then(() => {}))}
        >
          <Trash2Icon />
        </Button>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-slot="habit-plan">
      {optimistic.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing queued yet. Write down the next few things to do, one per line, so the next
          session starts without thinking. Give an item a date when it belongs to a particular day.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">{open.map((item, i) => row(item, i, open.length))}</ol>
      )}
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="habitId" value={habitId} />
        <div className="min-w-0 flex-1">
          <Input
            name="title"
            placeholder="Next time: read chapter 3 and do the exercises"
            aria-label="What to do next"
            required
            maxLength={200}
          />
        </div>
        <Input name="plannedDate" type="date" aria-label="On which day" className="w-auto" />
        <SubmitButton size="sm" variant="outline" pendingLabel="Adding…">
          <PlusIcon data-icon="inline-start" />
          Add
        </SubmitButton>
      </form>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {done.length > 0 && (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer">{done.length} done</summary>
          <ol className="mt-1 flex flex-col gap-1">
            {done.map((item, i) => row(item, i, done.length))}
          </ol>
        </details>
      )}
    </div>
  );
}
