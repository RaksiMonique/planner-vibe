'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DIET_TAGS } from '../schema';

/** Dietary tag chips plus a free-text box, submitted as a comma-separated `dietaryTags` field. */
export function TagPicker({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [custom, setCustom] = useState('');
  const toggle = (tag: string) =>
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  const all = [...new Set([...DIET_TAGS, ...selected])];
  const value = [
    ...selected,
    ...custom
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  ].join(',');
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="dietaryTags" value={value} />
      <div className="flex flex-wrap gap-1.5">
        {all.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(tag)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                active
                  ? 'border-primary bg-secondary text-secondary-foreground'
                  : 'bg-card hover:bg-muted'
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <Input
        aria-label="Other tags"
        placeholder="Other tags, comma separated"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
      />
    </div>
  );
}
