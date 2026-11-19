import Link from 'next/link';
import { parseISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { CircleCheckIcon } from 'lucide-react';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { toDateKey, weekRange, type WeekStartsOn } from '@/lib/dates';
import { countCompletedSince, listRecentlyCompleted } from '../queries';
import { completedWording } from '../recency';

const PREVIEW = 6;

/** The last few tasks finished, and how many were done this week. */
export async function CompletedDashboardCard({
  userId,
  todayKey,
  timeZone,
  weekStartsOn,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const weekStartKey = toDateKey(weekRange(parseISO(todayKey), weekStartsOn).start);
  const weekStart = fromZonedTime(`${weekStartKey}T00:00:00`, timeZone);
  const [recent, thisWeek] = await Promise.all([
    listRecentlyCompleted(userId, PREVIEW),
    countCompletedSince(userId, weekStart),
  ]);

  return (
    <DashboardCard title="Recently completed" icon={CircleCheckIcon} href="/tasks" release={6}>
      {recent.length === 0 ? (
        <EmptyNote>Nothing finished yet this week. Tick a task off and it shows here.</EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {thisWeek === 0 ? 'Nothing' : thisWeek} done this week.
          </p>
          <ul className="flex flex-col gap-1.5">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <SegmentDot accent={t.segment.accent} />
                <Link
                  href={`/tasks?task=${t.id}`}
                  className="link text-muted-foreground min-w-0 flex-1 truncate line-through"
                >
                  {t.title}
                </Link>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {completedWording(t.completedAt ?? t.updatedAt, todayKey, timeZone)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardCard>
  );
}
