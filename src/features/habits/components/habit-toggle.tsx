'use client';

import { useState, useTransition } from 'react';
import { CheckIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toggleHabitCheckIn } from '../actions';

/**
 * Records or removes a check-in for one date, optimistically. Parents key
 * this component by `${habitId}:${dateKey}:${done}` so a server refresh
 * resets the optimistic state.
 */
export function HabitToggle({
  habitId,
  dateKey,
  done,
  label,
  disabled,
  variant = 'check',
  className,
}: {
  habitId: string;
  dateKey: string;
  done: boolean;
  label: string;
  disabled?: boolean;
  variant?: 'check' | 'cell';
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const value = optimistic ?? done;

  function toggle(next: boolean) {
    setOptimistic(next);
    setError(null);
    start(async () => {
      const result = await toggleHabitCheckIn(habitId, dateKey, next);
      if (!result.ok) {
        setOptimistic(null);
        setError(result.error);
      }
    });
  }

  if (variant === 'cell') {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={value}
        aria-label={label}
        title={error ?? label}
        disabled={disabled || pending}
        onClick={() => toggle(!value)}
        className={cn(
          'flex size-7 items-center justify-center rounded-md border transition-colors',
          value
            ? 'bg-primary text-primary-foreground border-transparent'
            : 'bg-card hover:bg-muted',
          disabled && 'cursor-not-allowed opacity-40',
          pending && 'opacity-60',
          error && 'border-destructive',
          className
        )}
      >
        {value && <CheckIcon className="size-3.5" aria-hidden />}
      </button>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Checkbox
        checked={value}
        disabled={disabled || pending}
        aria-label={label}
        onCheckedChange={(checked) => toggle(checked === true)}
      />
      {error && <span className="text-destructive text-xs">{error}</span>}
    </span>
  );
}
