import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { BookHeartIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { excerpt } from '@/features/journal/schema';
import type { WeekStartsOn } from '@/lib/dates';
import { listRecentWellnessJournal } from '../queries';
import { SCOPE_TITLES, type WellnessJournalScope } from '../schema';

const scopeOf = (title: string | null): WellnessJournalScope =>
  (Object.keys(SCOPE_TITLES) as WellnessJournalScope[]).find((k) => SCOPE_TITLES[k] === title) ??
  'daily';

/** The latest wellness journal entry and whether today has one, with a link to write it. */
export async function WellnessJournalDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const recent = await listRecentWellnessJournal(userId, 5);
  const latest = recent[0] ?? null;
  const today = recent.find((e) => e.date === todayKey && scopeOf(e.title) === 'daily') ?? null;
  const logHref = `/wellness/journal?scope=daily&date=${todayKey}`;

  return (
    <DashboardCard
      title="Wellness journal"
      icon={BookHeartIcon}
      href="/wellness/journal"
      release={6}
    >
      {!latest ? (
        <EmptyNote>
          No entries yet.{' '}
          <Link href={logHref} className="text-primary link">
            Write about today.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {today ? (
              <>Today is written up.</>
            ) : (
              <>
                Nothing for today yet.{' '}
                <Link href={logHref} className="text-primary link">
                  Log today
                </Link>
              </>
            )}
          </p>
          <div className="flex flex-col gap-1">
            <Link
              href={`/wellness/journal?scope=${scopeOf(latest.title)}&date=${latest.date}`}
              className="text-primary link text-xs"
            >
              {format(parseISO(latest.date), 'EEE d MMM')} · {scopeOf(latest.title)}
            </Link>
            <p className="line-clamp-3 text-sm">{excerpt(latest.content, 240)}</p>
          </div>
          {today && (
            <Link href={logHref} className="text-primary link text-xs">
              Add to today&apos;s entry
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
