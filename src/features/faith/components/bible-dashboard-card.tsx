import Link from 'next/link';
import { BookOpenIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared/progress-bar';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { getActivePlanOverview, getDevotional, listStudies } from '../queries';
import { nextStudy } from '../studies';
import { ReadingToday } from './reading-today';

/** Today's reading from the active plan, the study to continue, and today's devotional. */
export async function BibleDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const [overview, devotional, studies] = await Promise.all([
    getActivePlanOverview(userId, todayKey),
    getDevotional(userId, todayKey),
    listStudies(userId),
  ]);
  const next = nextStudy(studies);

  return (
    <DashboardCard title="Bible study" icon={BookOpenIcon} href="/bible" release={3}>
      {!overview && !devotional && !next ? (
        <EmptyNote>
          No reading plan or study yet.{' '}
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
          {next && (
            <p className="text-sm">
              <span className="text-muted-foreground">
                {next.mode === 'continue' ? 'Continue: ' : 'Next study: '}
              </span>
              <Link href={`/bible/${next.study.id}`} className="hover:underline">
                {next.study.title}
              </Link>
            </p>
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
