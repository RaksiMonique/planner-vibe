import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { FolderKanbanIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared/progress-bar';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { listProjects } from '@/features/projects/queries';
import { listTasks } from '@/features/tasks/queries';
import { cn } from '@/lib/utils';
import { getWorkSegment } from '../queries';

const PREVIEW = 5;

/** Projects still in play in the work segment, with progress and the next task due. */
export async function WorkProjectsDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const segment = await getWorkSegment(userId).catch(() => null);
  const [projects, dueTasks] = segment
    ? await Promise.all([
        listProjects(userId, { lifeSegmentId: segment.id }),
        listTasks(userId, { lifeSegmentId: segment.id, onlyWithDueDate: true }),
      ])
    : [[], []];
  // listTasks orders by due date, so the first task found per project is its next one.
  const nextTask = new Map<string, (typeof dueTasks)[number]>();
  for (const t of dueTasks)
    if (t.projectId && !nextTask.has(t.projectId)) nextTask.set(t.projectId, t);
  const shown = projects.slice(0, PREVIEW);
  const more = projects.length - shown.length;

  return (
    <DashboardCard title="Work projects" icon={FolderKanbanIcon} href="/work/projects" release={6}>
      {!segment ? (
        <EmptyNote>
          Add a Life Segment for work first.{' '}
          <Link href="/segments" className="text-primary link">
            Open Life Segments.
          </Link>
        </EmptyNote>
      ) : projects.length === 0 ? (
        <EmptyNote>
          No work projects in progress.{' '}
          <Link href="/work/projects" className="text-primary link">
            See the Work projects page.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {shown.map((p) => {
              const next = nextTask.get(p.id);
              const overdue = p.dueDate !== null && p.dueDate < todayKey;
              return (
                <li key={p.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link
                      href={`/projects/${p.id}`}
                      className="link min-w-0 truncate text-sm font-medium"
                      title={p.title}
                    >
                      {p.title}
                    </Link>
                    {p.dueDate && (
                      <span
                        className={cn(
                          'shrink-0 text-xs',
                          overdue ? 'text-destructive' : 'text-muted-foreground'
                        )}
                      >
                        Due {format(parseISO(p.dueDate), 'd MMM')}
                      </span>
                    )}
                  </div>
                  <ProgressBar
                    value={p.progress}
                    valueText={`${p.taskDone}/${p.taskTotal} tasks`}
                  />
                  {next?.dueDate && (
                    <p className="text-muted-foreground truncate text-xs" title={next.title}>
                      Next {format(parseISO(next.dueDate), 'EEE d MMM')}: {next.title}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {more > 0 && (
            <Link href="/work/projects" className="text-primary link text-xs">
              {more} more on the Work projects page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
