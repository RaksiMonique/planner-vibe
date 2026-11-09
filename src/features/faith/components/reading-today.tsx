'use client';

import { useState, useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { markChapterRead } from '../actions';
import { bookById } from '../bible-books';

export type TodayChapter = { bookId: number; chapter: number; read: boolean };

/** Today's chapters with "mark read" toggles; optimistic, keyed by the parent on the data. */
export function ReadingToday({
  planId,
  dateKey,
  chapters,
}: {
  planId: string;
  dateKey: string;
  chapters: TodayChapter[];
}) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  function toggle(c: TodayChapter, next: boolean) {
    const key = `${c.bookId}:${c.chapter}`;
    setOptimistic((o) => ({ ...o, [key]: next }));
    setError(null);
    start(async () => {
      const result = await markChapterRead(planId, c.bookId, c.chapter, next, dateKey);
      if (!result.ok) {
        setOptimistic((o) => ({ ...o, [key]: c.read }));
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-1">
        {chapters.map((c) => {
          const key = `${c.bookId}:${c.chapter}`;
          const read = optimistic[key] ?? c.read;
          const label = `${bookById(c.bookId)?.name ?? ''} ${c.chapter}`;
          return (
            <li key={key}>
              <label className="hover:bg-muted/60 flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1">
                <Checkbox
                  checked={read}
                  disabled={pending}
                  aria-label={read ? `Mark ${label} unread` : `Mark ${label} read`}
                  onCheckedChange={(checked) => toggle(c, checked === true)}
                />
                <span className={cn('text-sm', read && 'text-muted-foreground line-through')}>
                  {label}
                </span>
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
