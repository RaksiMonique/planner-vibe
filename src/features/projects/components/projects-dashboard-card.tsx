import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { FolderKanbanIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { listTasks } from '@/features/tasks/queries';
import type { WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { listProjects } from '../queries';

const PREVIEW = 5;

/** Active projects with their progress and the next open task on each. */
export async function ProjectsDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const [projects, openTasks] = await Promise.all([
    listProjects(userId),
    listTasks(userId, { status: 'open' }),
  ]);
  const shown = projects.slice(0, PREVIEW);
  const more = projects.length - shown.length;
  // Open tasks arrive due date first, so the first match is the next thing to do.
  const nextTask = (projectId: string) => openTasks.find((t) => t.projectId === projectId);

  return (
    <DashboardCard title="Projects" icon={FolderKanbanIcon} href="/projects" release={6}>
      {projects.length === 0 ? (
        <EmptyNote>
          No active projects.{' '}
          <Link href="/projects" className="text-primary link">
            Start one.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {shown.map((p) => {
              const next = nextTask(p.id);
              const overdue = next?.dueDate ? next.dueDate < todayKey : false;
              return (
                <li key={p.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    <SegmentDot accent={p.segment.accent} />
                    <Link href={`/projects/${p.id}`} className="link min-w-0 flex-1 truncate">
                      {p.title}
                    </Link>
                  </div>
                  <ProgressBar value={p.progress} />
                  {next && (
                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate">Next, {next.title}</span>
                      {next.dueDate && (
                        <span className={cn('tabular-nums', overdue && 'text-destructive')}>
                          {format(parseISO(next.dueDate), 'd MMM')}
                        </span>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {more > 0 && (
            <Link href="/projects" className="text-primary link text-xs">
              {more} more on the Projects page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
