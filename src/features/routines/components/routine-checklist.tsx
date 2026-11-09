'use client';

import { useState, useTransition } from 'react';
import { ActivityIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressBar } from '@/components/shared/progress-bar';
import { cn } from '@/lib/utils';
import { toggleRoutineStep } from '../actions';
import { routineProgress } from '../grouping';

export type ChecklistStep = {
  id: string;
  title: string;
  durationMinutes: number | null;
  habitId: string | null;
};

/**
 * Step checklist for one routine on one date. Parents key it by the saved
 * completed ids so a server refresh resets the optimistic state.
 */
export function RoutineChecklist({
  routineId,
  routineName,
  dateKey,
  steps,
  completedStepIds,
  compact = false,
}: {
  routineId: string;
  routineName: string;
  dateKey: string;
  steps: ChecklistStep[];
  completedStepIds: string[];
  compact?: boolean;
}) {
  const [completed, setCompleted] = useState<Set<string>>(() => new Set(completedStepIds));
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const progress = routineProgress(
    steps.map((s) => s.id),
    [...completed]
  );

  function toggle(stepId: string, done: boolean) {
    setError(null);
    setCompleted((prev) => {
      const next = new Set(prev);
      if (done) next.add(stepId);
      else next.delete(stepId);
      return next;
    });
    setPendingIds((prev) => new Set(prev).add(stepId));
    start(async () => {
      const result = await toggleRoutineStep(routineId, stepId, dateKey, done);
      if (!result.ok) {
        setError(result.error);
        setCompleted((prev) => {
          const next = new Set(prev);
          if (done) next.delete(stepId);
          else next.add(stepId);
          return next;
        });
      }
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(stepId);
        return next;
      });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ProgressBar
        value={progress.percent}
        valueText={progress.complete ? 'Done' : `${progress.done} of ${progress.total}`}
      />
      <ul className={cn('flex flex-col', compact ? 'gap-0.5' : 'gap-1')}>
        {steps.map((step) => {
          const done = completed.has(step.id);
          return (
            <li key={step.id}>
              <label
                className={cn(
                  'hover:bg-muted/60 flex cursor-pointer items-center gap-2.5 rounded-lg px-1 text-sm',
                  compact ? 'py-0.5' : 'py-1',
                  pendingIds.has(step.id) && 'opacity-60'
                )}
              >
                <Checkbox
                  checked={done}
                  disabled={pendingIds.has(step.id)}
                  aria-label={`${routineName}: ${step.title}`}
                  onCheckedChange={(checked) => toggle(step.id, checked === true)}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    done && 'text-muted-foreground line-through'
                  )}
                >
                  {step.title}
                </span>
                {step.habitId && (
                  <ActivityIcon
                    className="text-muted-foreground size-3.5 shrink-0"
                    aria-label="Also records a habit check-in"
                  />
                )}
                {step.durationMinutes && !compact && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {step.durationMinutes} min
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
