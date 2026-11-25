'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { SegmentDot } from '@/components/shared/segment-badge';
import { toggleHabitCheckIn } from '@/features/habits/actions';
import { toggleRoutineStep } from '@/features/routines/actions';
import { toggleTaskDoneAction } from '@/features/tasks/actions';
import type { Accent } from '@/lib/accents';
import { cn } from '@/lib/utils';

function useToggle(run: (next: boolean) => Promise<{ ok: boolean; error?: string }>) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return {
    pending,
    error,
    toggle: (next: boolean) =>
      start(async () => {
        const result = await run(next);
        setError(result.ok ? null : (result.error ?? 'That did not save.'));
        if (result.ok) router.refresh();
      }),
  };
}

export function TaskToggle({
  id,
  title,
  done,
  accent,
}: {
  id: string;
  title: string;
  done: boolean;
  accent: Accent;
}) {
  const { pending, error, toggle } = useToggle((next) => toggleTaskDoneAction(id, next));
  return (
    <div className="flex flex-col gap-0.5">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox
          checked={done}
          disabled={pending}
          onCheckedChange={(c) => toggle(c === true)}
          aria-label={done ? `Reopen ${title}` : `Complete ${title}`}
        />
        <SegmentDot accent={accent} className="size-2" />
        <span
          className={cn('min-w-0 flex-1 truncate', done && 'text-muted-foreground line-through')}
        >
          {title}
        </span>
      </label>
      {error && (
        <p role="alert" className="text-destructive pl-6 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function HabitToggle({
  habitId,
  dateKey,
  name,
  done,
  accent,
}: {
  habitId: string;
  dateKey: string;
  name: string;
  done: boolean;
  accent: Accent;
}) {
  const { pending, toggle } = useToggle((next) => toggleHabitCheckIn(habitId, dateKey, next));
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox
        checked={done}
        disabled={pending}
        onCheckedChange={(c) => toggle(c === true)}
        aria-label={`${name} on ${dateKey}`}
      />
      <SegmentDot accent={accent} className="size-2" />
      <span className={cn('min-w-0 flex-1 truncate', done && 'text-muted-foreground')}>{name}</span>
    </label>
  );
}

export function RoutineStepToggle({
  routineId,
  stepId,
  dateKey,
  title,
  done,
}: {
  routineId: string;
  stepId: string;
  dateKey: string;
  title: string;
  done: boolean;
}) {
  const { pending, toggle } = useToggle((next) =>
    toggleRoutineStep(routineId, stepId, dateKey, next)
  );
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs">
      <Checkbox
        checked={done}
        disabled={pending}
        onCheckedChange={(c) => toggle(c === true)}
        aria-label={`${title} on ${dateKey}`}
      />
      <span className={cn('min-w-0 flex-1 truncate', done && 'text-muted-foreground line-through')}>
        {title}
      </span>
    </label>
  );
}
