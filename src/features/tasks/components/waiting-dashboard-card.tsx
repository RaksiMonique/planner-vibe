import Link from 'next/link';
import { HourglassIcon } from 'lucide-react';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import type { WeekStartsOn } from '@/lib/dates';
import { listTasks } from '../queries';

const PREVIEW = 6;

/** Open tasks that wait on another task, and what they wait for. */
export async function WaitingDashboardCard({
  userId,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const open = await listTasks(userId, { status: 'open' });
  const waiting = open.filter((t) => t.blockedBy.length > 0);
  const shown = waiting.slice(0, PREVIEW);
  const more = waiting.length - shown.length;

  return (
    <DashboardCard title="Waiting on" icon={HourglassIcon} href="/tasks" release={6}>
      {waiting.length === 0 ? (
        <EmptyNote>Nothing is waiting on anything else.</EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {waiting.length} {waiting.length === 1 ? 'task waits' : 'tasks wait'} on another task.
          </p>
          <ul className="flex flex-col gap-2">
            {shown.map((t) => {
              const [first, ...rest] = t.blockedBy;
              return (
                <li key={t.id} className="flex items-start gap-2 text-sm">
                  <SegmentDot accent={t.segment.accent} className="mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/tasks?task=${t.id}`} className="link block truncate">
                      {t.title}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      after{' '}
                      <Link href={`/tasks?task=${first.id}`} className="link">
                        {first.title}
                      </Link>
                      {rest.length > 0 && ` and ${rest.length} more`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {more > 0 && (
            <Link href="/tasks" className="text-primary link text-xs">
              {more} more on the Tasks page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
