'use client';

import { useState, useTransition } from 'react';
import { CheckIcon, DicesIcon, FootprintsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleHabitCheckIn } from '@/features/habits/actions';
import { pickBreakIdea, type BreakIdeaView } from '../schema';
import { StarterIdeasButton } from './starter-ideas-button';

/**
 * Rolls one break idea at random so a pause does not default to scrolling.
 * Movement ideas come up twice as often after seated work. An idea tied to a
 * habit can be checked in from here once it is done.
 */
export function BreakPicker({
  ideas,
  preferMovement = false,
  todayKey,
  prompt = 'Take a break',
  onChanged,
}: {
  ideas: BreakIdeaView[];
  preferMovement?: boolean;
  /** yyyy-MM-dd in the user's zone, for the habit check-in. */
  todayKey: string;
  /** The line above the button, e.g. "Session over. Roll a break?" */
  prompt?: string;
  onChanged?: () => void;
}) {
  const [pick, setPick] = useState<BreakIdeaView | null>(null);
  const [checkedIn, setCheckedIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function roll() {
    setError(null);
    setPick(pickBreakIdea(ideas, { preferMovement, exclude: pick?.id }));
  }

  function checkIn(idea: BreakIdeaView) {
    if (!idea.habitId) return;
    const habitId = idea.habitId;
    setError(null);
    startTransition(async () => {
      const result = await toggleHabitCheckIn(habitId, todayKey, true);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCheckedIn(idea.id);
      onChanged?.();
    });
  }

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col gap-2" data-slot="break-picker">
        <p className="text-muted-foreground text-sm">
          No break ideas yet. Add a few and a session&apos;s end can offer one.
        </p>
        <StarterIdeasButton onChanged={onChanged} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-slot="break-picker">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium">{prompt}</p>
        <Button type="button" size="sm" variant={pick ? 'ghost' : 'secondary'} onClick={roll}>
          <DicesIcon data-icon="inline-start" />
          {pick ? 'Another' : 'Roll a break'}
        </Button>
      </div>
      {pick && (
        <div className="bg-blush/60 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2">
          {pick.isMovement && (
            <FootprintsIcon className="text-primary size-4 shrink-0" aria-label="Gets you moving" />
          )}
          <p className="min-w-0 flex-1 text-sm break-words" data-slot="break-pick">
            {pick.title}
          </p>
          {pick.habitId &&
            (checkedIn === pick.id ? (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <CheckIcon className="size-3.5" aria-hidden />
                Checked in.
              </span>
            ) : (
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => checkIn(pick)}
                disabled={pending}
              >
                {pending ? 'Checking in…' : 'Done, check in'}
              </Button>
            ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
