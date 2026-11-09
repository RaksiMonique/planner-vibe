'use client';

import { cn } from '@/lib/utils';

/** Five-step scale as a radio group; submits through a hidden input when `name` is set. */
export function MoodScale({
  label,
  name,
  value,
  onChange,
  words,
  size = 'default',
}: {
  label: string;
  name?: string;
  value: number | null;
  onChange: (v: number) => void;
  words: Record<number, string>;
  size?: 'default' | 'sm';
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">{value ? words[value] : 'Not set'}</span>
      </div>
      {name && <input type="hidden" name={name} value={value ?? ''} />}
      <div role="radiogroup" aria-label={label} className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${label} ${n}, ${words[n]}`}
            onClick={() => onChange(n)}
            className={cn(
              'rounded-full border text-sm transition-colors',
              size === 'sm' ? 'size-7 text-xs' : 'size-9',
              value === n
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-card hover:bg-muted'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
