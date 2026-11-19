import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { SparklesIcon } from 'lucide-react';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { listGoals } from '@/features/goals/queries';
import { listTasks } from '@/features/tasks/queries';
import type { WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { listSegments } from '../service';
import { spotlightIndex } from '../spotlight';

const PREVIEW = 4;

/** One Life Segment a day, with its open tasks and active goals. */
export async function SegmentSpotlightDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const segments = await listSegments(userId);
  const segment = segments[spotlightIndex(todayKey, segments.length)];

  if (!segment) {
    return (
      <DashboardCard title="Segment spotlight" icon={SparklesIcon} href="/segments" release={6}>
        <EmptyNote>
          No Life Segments yet.{' '}
          <Link href="/segments" className="text-primary link">
            Create one.
          </Link>
        </EmptyNote>
      </DashboardCard>
    );
  }

  const [tasks, goals] = await Promise.all([
    listTasks(userId, { lifeSegmentId: segment.id, status: 'open' }),
    listGoals(userId, { lifeSegmentId: segment.id }),
  ]);
  const shown = tasks.slice(0, PREVIEW);
  const more = tasks.length - shown.length;
  const href = `/segments/${segment.slug}`;

  return (
    <DashboardCard title="Segment spotlight" icon={SparklesIcon} href={href} release={6}>
      <div className="flex flex-col gap-1">
        <Link
          href={href}
          className="font-heading link flex items-center gap-2 text-lg leading-snug"
        >
          <SegmentDot accent={segment.accent} className="size-3" />
          {segment.name}
        </Link>
        <p className="text-muted-foreground text-xs">
          {tasks.length} open {tasks.length === 1 ? 'task' : 'tasks'} and {goals.length} active{' '}
          {goals.length === 1 ? 'goal' : 'goals'}.
        </p>
      </div>
      {tasks.length === 0 ? (
        <EmptyNote>Nothing open here today.</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {shown.map((t) => {
            const overdue = t.dueDate !== null && t.dueDate < todayKey;
            return (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <Link href={`/tasks?task=${t.id}`} className="link min-w-0 flex-1 truncate">
                  {t.title}
                </Link>
                {t.dueDate && (
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      overdue ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {format(parseISO(t.dueDate), 'd MMM')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {more > 0 && (
        <Link href={href} className="text-primary link text-xs">
          {more} more on the {segment.name} page
        </Link>
      )}
    </DashboardCard>
  );
}
