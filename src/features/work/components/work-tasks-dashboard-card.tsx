import Link from 'next/link';
import { parseISO } from 'date-fns';
import { ListChecksIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { TaskRow } from '@/features/tasks/components/task-row';
import { listTasks } from '@/features/tasks/queries';
import { dueStatus, toDateKey, weekRange, type WeekStartsOn } from '@/lib/dates';
import { getWorkSegment } from '../queries';

const PREVIEW = 6;

/** Open work tasks due by the end of this week, overdue ones first, with the done checkbox. */
export async function WorkTasksDashboardCard({
  userId,
  todayKey,
  weekStartsOn,
}: {
  userId: string;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
}) {
  const today = parseISO(todayKey);
  const weekEnd = toDateKey(weekRange(today, weekStartsOn).end);
  const segment = await getWorkSegment(userId).catch(() => null);
  // Ordered by due date, so overdue tasks come first on their own.
  const tasks = segment
    ? await listTasks(userId, { lifeSegmentId: segment.id, dueTo: weekEnd, onlyWithDueDate: true })
    : [];
  const overdue = tasks.filter((t) => t.dueDate !== null && t.dueDate < todayKey).length;
  const dueThisWeek = tasks.length - overdue;
  const shown = tasks.slice(0, PREVIEW);
  const more = tasks.length - shown.length;

  return (
    <DashboardCard title="Work tasks" icon={ListChecksIcon} href="/work/tasks" release={6}>
      {!segment ? (
        <EmptyNote>
          Add a Life Segment for work first.{' '}
          <Link href="/segments" className="text-primary link">
            Open Life Segments.
          </Link>
        </EmptyNote>
      ) : tasks.length === 0 ? (
        <EmptyNote>
          Nothing due this week at work.{' '}
          <Link href="/work/tasks" className="text-primary link">
            See all work tasks.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {dueThisWeek} due this week, {overdue} overdue.
          </p>
          <div className="-mx-1.5 flex flex-col">
            {shown.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                status={dueStatus(t.dueDate, today, weekStartsOn)}
                editHref={`/work/tasks?task=${t.id}`}
                compact
              />
            ))}
          </div>
          {more > 0 && (
            <Link href="/work/tasks" className="text-primary link text-xs">
              {more} more on the Work tasks page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
