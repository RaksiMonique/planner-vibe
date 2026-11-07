import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { addMonths, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import { toDateKey } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { JournalEntryRow } from '../queries';
import { excerpt, MOOD_LABELS } from '../schema';

const KIND_LABEL: Record<string, string> = {
  daily: 'Journal',
  gratitude: 'Gratitude',
  wellness: 'Wellness',
  reflection: 'Reflection',
};

export function journalHref(params: { date?: string; month?: string }): string {
  const p = new URLSearchParams();
  if (params.date) p.set('date', params.date);
  if (params.month) p.set('month', params.month);
  const qs = p.toString();
  return qs ? `/journal?${qs}` : '/journal';
}

/** Month strip with a dot per written day, and the latest entries. */
export function JournalTimeline({
  monthKey,
  selectedKey,
  todayKey,
  monthEntries,
  recent,
}: {
  monthKey: string;
  selectedKey: string;
  todayKey: string;
  monthEntries: JournalEntryRow[];
  recent: JournalEntryRow[];
}) {
  const monthStart = startOfMonth(parseISO(`${monthKey}-01`));
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });
  const written = new Map<string, JournalEntryRow[]>();
  for (const e of monthEntries) {
    const list = written.get(e.date) ?? [];
    list.push(e);
    written.set(e.date, list);
  }
  const prev = format(addMonths(monthStart, -1), 'yyyy-MM');
  const next = format(addMonths(monthStart, 1), 'yyyy-MM');

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="items-center">
          <CardTitle className="font-heading text-lg">
            <h2>{format(monthStart, 'MMMM yyyy')}</h2>
          </CardTitle>
          <CardAction className="flex gap-1">
            <Link
              href={journalHref({ date: selectedKey, month: prev })}
              aria-label="Previous month"
              className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
            >
              <ChevronLeftIcon />
            </Link>
            <Link
              href={journalHref({ date: selectedKey, month: next })}
              aria-label="Next month"
              className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
            >
              <ChevronRightIcon />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = toDateKey(d);
              const entries = written.get(key) ?? [];
              const selected = key === selectedKey;
              const future = key > todayKey;
              return (
                <Link
                  key={key}
                  href={journalHref({ date: key, month: monthKey })}
                  aria-current={selected ? 'date' : undefined}
                  className={cn(
                    'flex h-9 flex-col items-center justify-center rounded-lg text-xs transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : future
                        ? 'text-muted-foreground/60'
                        : 'hover:bg-muted',
                    key === todayKey && !selected && 'ring-primary ring-1'
                  )}
                >
                  <span className="tabular-nums">{d.getDate()}</span>
                  <span className="flex h-1.5 gap-0.5">
                    {entries.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={cn(
                          'size-1.5 rounded-full',
                          selected ? 'bg-primary-foreground' : 'bg-primary'
                        )}
                      />
                    ))}
                  </span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            <h2>Recent</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing written yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recent.map((e) => (
                <li key={e.id}>
                  <Link
                    href={journalHref({ date: e.date, month: e.date.slice(0, 7) })}
                    className="hover:bg-muted/60 -mx-1 flex flex-col gap-0.5 rounded-lg px-1 py-1"
                  >
                    <span className="text-muted-foreground flex items-center gap-2 text-xs">
                      <SegmentDot accent={e.segment.accent} />
                      {format(parseISO(e.date), 'EEE d MMM')} · {KIND_LABEL[e.kind] ?? e.kind}
                      {e.mood ? ` · ${MOOD_LABELS[e.mood]}` : ''}
                    </span>
                    <span className="text-sm">{e.title ?? excerpt(e.content, 100)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
