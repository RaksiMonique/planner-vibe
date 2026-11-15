import type { Metadata } from 'next';
import Link from 'next/link';
import { ChartPieIcon, PlusIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { listGoals } from '@/features/goals/queries';
import { SegmentCard } from '@/features/life-segments/components/segment-card';
import { SegmentFormDialog } from '@/features/life-segments/components/segment-form-dialog';
import { listSegments } from '@/features/life-segments/service';
import { listProjects } from '@/features/projects/queries';
import { countOpenTasksBySegment } from '@/features/tasks/queries';
import { addDays } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { expandEvents } from '@/features/calendar/expand';
import { listEventsBetween } from '@/features/calendar/queries';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Life Segments' };
export const dynamic = 'force-dynamic';

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) out[key(row)] = (out[key(row)] ?? 0) + 1;
  return out;
}

export default async function SegmentsPage({ searchParams }: PageProps<'/segments'>) {
  const user = await requireUser();
  const params = await searchParams;
  const showArchived = params.archived === '1';
  const prefs = await getPreferences(user.id);
  const today = todayInZone(prefs.timeZone);
  const eventsFrom = fromZonedTime(`${toDateKey(today)}T00:00:00`, prefs.timeZone);
  const eventsTo = fromZonedTime(`${toDateKey(addDays(today, 14))}T00:00:00`, prefs.timeZone);
  const [segments, taskCounts, goals, projects, eventRows] = await Promise.all([
    listSegments(user.id, { includeArchived: showArchived }),
    countOpenTasksBySegment(user.id),
    listGoals(user.id),
    listProjects(user.id),
    listEventsBetween(user.id, eventsFrom, eventsTo),
  ]);
  const eventCounts = countBy(
    expandEvents(eventRows, eventsFrom, eventsTo).filter((i) => i.segmentId),
    (i) => i.segmentId as string
  );
  const goalCounts = countBy(goals, (g) => g.lifeSegmentId);
  const projectCounts = countBy(projects, (p) => p.lifeSegmentId);

  return (
    <>
      <PageHeader
        title="Segments"
        description="The areas of life everything else belongs to. Archive a segment to hide it without losing its records."
        actions={
          <>
            <Link
              href={showArchived ? '/segments' : '/segments?archived=1'}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </Link>
            <SegmentFormDialog
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  New segment
                </>
              }
            />
          </>
        }
      />
      {segments.length === 0 ? (
        <EmptyState
          icon={ChartPieIcon}
          title="No segments yet"
          description="Create the areas of life you want to plan around."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {segments.map((s) => (
            <SegmentCard
              key={s.id}
              segment={s}
              openTasks={taskCounts[s.id] ?? 0}
              activeGoals={goalCounts[s.id] ?? 0}
              activeProjects={projectCounts[s.id] ?? 0}
              upcomingEvents={eventCounts[s.id] ?? 0}
            />
          ))}
        </div>
      )}
    </>
  );
}
