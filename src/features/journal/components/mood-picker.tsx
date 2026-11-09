'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MOOD_LABELS } from '../schema';

/** Five-step mood input that submits through a hidden field. */
export function MoodPicker({
  name = 'mood',
  defaultValue,
}: {
  name?: string;
  defaultValue?: number | null;
}) {
  const [value, setValue] = useState<number | null>(defaultValue ?? null);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name={name} value={value ?? ''} />
      <div role="radiogroup" aria-label="Mood" className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}, ${MOOD_LABELS[n]}`}
            onClick={() => setValue(value === n ? null : n)}
            className={cn(
              'size-8 rounded-full border text-sm transition-colors',
              value === n
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-card hover:bg-muted'
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <span className="text-muted-foreground text-xs">
        {value ? MOOD_LABELS[value] : 'Mood (optional)'}
      </span>
    </div>
  );
}
