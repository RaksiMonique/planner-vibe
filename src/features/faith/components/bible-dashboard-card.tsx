import Link from 'next/link';
import { BookOpenIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared/progress-bar';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { getActivePlanOverview, getDevotional } from '../queries';
import { ReadingToday } from './reading-today';

/** Today's reading from the active plan, its progress and today's devotional. */
export async function BibleDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const [overview, devotional] = await Promise.all([
    getActivePlanOverview(userId, todayKey),
    getDevotional(userId, todayKey),
  ]);

  return (
    <DashboardCard title="Bible study" icon={BookOpenIcon} href="/bible" release={3}>
      {!overview && !devotional ? (
        <EmptyNote>
          No reading plan yet.{' '}
          <Link href="/bible" className="text-primary hover:underline">
            Start one.
          </Link>
        </EmptyNote>
      ) : (
        <>
          {overview && (
            <>
              <p className="text-muted-foreground text-xs">{overview.plan.name}</p>
              <ReadingToday
                key={overview.today.map((c) => `${c.bookId}:${c.chapter}:${c.read}`).join('|')}
                planId={overview.plan.id}
                dateKey={todayKey}
                chapters={overview.today}
              />
              <ProgressBar
                value={overview.progress.percent}
                label="Plan progress"
                valueText={`${overview.progress.read}/${overview.progress.total}`}
              />
            </>
          )}
          {devotional && (
            <p className="text-sm">
              <span className="text-muted-foreground">Devotional: </span>
              {devotional.title}
              {devotional.reference && (
                <span className="text-muted-foreground"> · {devotional.reference.label}</span>
              )}
            </p>
          )}
        </>
      )}
    </DashboardCard>
  );
}
