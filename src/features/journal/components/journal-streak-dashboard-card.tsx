import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { FlameIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { cn } from '@/lib/utils';
import { listEntriesBetween } from '../queries';
import { currentStreak, dayKeys, longestStreak } from '../streak';
import { journalHref } from './journal-timeline';

const LOOKBACK = 90;
const DOTS = 14;

/** Days in a row with a journal entry, the best run of late, and the last fortnight as dots. */
export async function JournalStreakDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const range = dayKeys(todayKey, LOOKBACK);
  const entries = await listEntriesBetween(userId, range[0], todayKey);
  const written = new Set(entries.map((e) => e.date));
  const streak = currentStreak(written, todayKey);
  const longest = longestStreak(written);
  const dots = dayKeys(todayKey, DOTS);
  const writtenToday = written.has(todayKey);

  return (
    <DashboardCard title="Journal streak" icon={FlameIcon} href="/journal" release={6}>
      {written.size === 0 ? (
        <EmptyNote>
          No entries yet.{' '}
          <Link href={journalHref({ date: todayKey })} className="text-primary link">
            Write your first.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-sm">
            <span className="font-heading text-2xl leading-none">{streak}</span>{' '}
            <span className="text-muted-foreground">
              {streak === 1 ? 'day' : 'days'} in a row
              {streak === 0 && '; today is a good day to start again'}.
            </span>
          </p>
          <div
            className="grid grid-cols-14 gap-1"
            role="img"
            aria-label={`The last fourteen days, ${dots.filter((k) => written.has(k)).length} with an entry`}
          >
            {dots.map((key) => {
              const has = written.has(key);
              const isToday = key === todayKey;
              return (
                <span
                  key={key}
                  title={`${format(parseISO(key), 'EEEE d MMMM')}: ${has ? 'written' : 'nothing'}`}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      'size-3 rounded-full border',
                      has ? 'bg-plum border-plum' : 'border-input bg-transparent',
                      isToday && 'ring-primary ring-2 ring-offset-1'
                    )}
                    aria-hidden
                  />
                </span>
              );
            })}
            {dots.map((key, i) => (
              <span
                key={`${key}-label`}
                className="text-muted-foreground text-center text-[10px] leading-none uppercase"
                aria-hidden
              >
                {i >= DOTS - 7 ? format(parseISO(key), 'EEEEE') : ''}
              </span>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Longest in the last {LOOKBACK} days: {longest} {longest === 1 ? 'day' : 'days'}.
            {!writtenToday && (
              <>
                {' '}
                <Link href={journalHref({ date: todayKey })} className="text-primary link">
                  Write today
                </Link>
              </>
            )}
          </p>
        </>
      )}
    </DashboardCard>
  );
}
