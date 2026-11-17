'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { saveMoodQuick } from '../actions';
import { ENERGY_WORDS, MOOD_WORDS } from '../schema';
import { MoodScale } from './mood-scale';

/**
 * Compact check-in for the dashboard: saves as soon as both scales are set.
 * `inline` puts the two scales side by side where there is room.
 */
export function MoodQuickPick({ dateKey, inline = false }: { dateKey: string; inline?: boolean }) {
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  function pick(nextMood: number | null, nextEnergy: number | null) {
    setMood(nextMood);
    setEnergy(nextEnergy);
    if (nextMood === null || nextEnergy === null) return;
    start(async () => {
      const result = await saveMoodQuick(dateKey, nextMood, nextEnergy);
      if (result.ok) {
        setStatus('saved');
        setError(null);
      } else {
        setStatus('error');
        setError(result.error);
      }
    });
  }

  return (
    <div className={cn('flex flex-col gap-3', inline && 'gap-2')}>
      <div className={cn('flex flex-col gap-3', inline && 'sm:flex-row sm:gap-8')}>
        <MoodScale
          label="Mood"
          value={mood}
          onChange={(v) => pick(v, energy)}
          words={MOOD_WORDS}
          size="sm"
        />
        <MoodScale
          label="Energy"
          value={energy}
          onChange={(v) => pick(mood, v)}
          words={ENERGY_WORDS}
          size="sm"
        />
      </div>
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {pending
          ? 'Saving…'
          : status === 'saved'
            ? 'Saved for today.'
            : status === 'error'
              ? error
              : 'Pick both to save.'}
      </p>
    </div>
  );
}
