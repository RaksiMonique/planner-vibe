import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export type TrendDay = { date: string; mood: number | null; energy: number | null };

/** Two bars per day, mood in burgundy and energy in sage, as plain CSS. */
export function MoodTrend({
  days,
  compact = false,
  className,
}: {
  days: TrendDay[];
  compact?: boolean;
  className?: string;
}) {
  const hasAny = days.some((d) => d.mood !== null);
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn('flex items-end gap-1', compact ? 'h-14' : 'h-28')}
        role="img"
        aria-label={`Mood and energy over the last ${days.length} days`}
      >
        {days.map((d) => (
          <div key={d.date} className="flex h-full flex-1 items-end justify-center gap-0.5">
            <span
              className="bg-primary w-1.5 rounded-t-sm sm:w-2"
              style={{ height: d.mood ? `${(d.mood / 5) * 100}%` : '2px' }}
              title={`${format(parseISO(d.date), 'EEE d MMM')}: mood ${d.mood ?? 'not set'}`}
            />
            <span
              className="bg-sage w-1.5 rounded-t-sm sm:w-2"
              style={{ height: d.energy ? `${(d.energy / 5) * 100}%` : '2px' }}
              title={`${format(parseISO(d.date), 'EEE d MMM')}: energy ${d.energy ?? 'not set'}`}
            />
          </div>
        ))}
      </div>
      {!compact && (
        <div className="text-muted-foreground flex gap-1 text-[10px]">
          {days.map((d, i) => (
            <span key={d.date} className="flex-1 text-center">
              {i === 0 || i === days.length - 1 || i % 7 === 0 ? format(parseISO(d.date), 'd') : ''}
            </span>
          ))}
        </div>
      )}
      <p className="text-muted-foreground flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="bg-primary inline-block size-2 rounded-sm" /> Mood
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-sage inline-block size-2 rounded-sm" /> Energy
        </span>
        {!hasAny && <span>No check-ins in this range yet.</span>}
      </p>
    </div>
  );
}
