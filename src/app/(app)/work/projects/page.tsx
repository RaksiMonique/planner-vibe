import type { Metadata } from 'next';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { BriefcaseIcon, FolderKanbanIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { listProjects } from '@/features/projects/queries';
import { PROJECT_STATUS_LABELS } from '@/features/projects/schema';
import { getPreferences } from '@/features/settings/service';
import { getWorkSegment } from '@/features/work/queries';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Work projects' };
export const dynamic = 'force-dynamic';

export default async function WorkProjectsPage() {
  const user = await requireUser();
  const [segment, prefs] = await Promise.all([getWorkSegment(user.id), getPreferences(user.id)]);
  const projects = await listProjects(user.id, { lifeSegmentId: segment.id, status: 'all' });
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const open = projects.filter((p) => p.status !== 'done' && p.status !== 'archived');
  const closed = projects.filter((p) => p.status === 'done' || p.status === 'archived');

  const row = (p: (typeof projects)[number]) => {
    const finished = p.status === 'done' || p.status === 'archived';
    const overdue = !finished && p.dueDate !== null && p.dueDate < todayKey;
    return (
      <li key={p.id}>
        <Link
          href={`/projects/${p.id}`}
          className={cn(
            'bg-card hover:bg-muted/40 flex flex-col gap-2 rounded-lg border px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:gap-4',
            finished && 'opacity-75'
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="font-heading truncate text-lg leading-snug">{p.title}</p>
            <p className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
              {p.dueDate && (
                <span className={cn(overdue && 'text-destructive')}>
                  Due {format(parseISO(p.dueDate), 'd MMM yyyy')}
                </span>
              )}
              <span>
                {p.taskDone}/{p.taskTotal} tasks
              </span>
              {p.milestoneTotal > 0 && (
                <span>
                  {p.milestoneDone}/{p.milestoneTotal} milestones
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:w-56">
            <ProgressBar value={p.progress} className="flex-1" />
            {p.status !== 'active' && (
              <Badge variant="secondary">{PROJECT_STATUS_LABELS[p.status]}</Badge>
            )}
          </div>
        </Link>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Work projects"
        description={`Projects in your ${segment.name} segment, with their progress worked out from tasks and milestones.`}
        actions={
          <Link
            href={`/projects?segment=${segment.slug}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <FolderKanbanIcon data-icon="inline-start" />
            Manage in Projects
          </Link>
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={BriefcaseIcon}
          title="No work projects yet"
          description={`Projects in the ${segment.name} segment appear here. Create one in Projects and choose that segment.`}
          action={
            <Link href="/projects" className={cn(buttonVariants({ size: 'sm' }))}>
              Go to Projects
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">
              In progress <span className="text-muted-foreground text-sm">{open.length}</span>
            </h3>
            {open.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing in progress right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">{open.map(row)}</ul>
            )}
          </section>
          {closed.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="font-heading text-xl">
                Finished <span className="text-muted-foreground text-sm">{closed.length}</span>
              </h3>
              <ul className="flex flex-col gap-2">{closed.map(row)}</ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
