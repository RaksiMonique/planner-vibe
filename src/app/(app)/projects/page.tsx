import type { Metadata } from 'next';
import Link from 'next/link';
import { FolderKanbanIcon, PlusIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { listGoalOptions } from '@/features/goals/queries';
import { SegmentFilter } from '@/features/life-segments/components/segment-filter';
import { listSegments } from '@/features/life-segments/service';
import { ProjectCard } from '@/features/projects/components/project-card';
import { ProjectFormDialog } from '@/features/projects/components/project-form-dialog';
import { listProjects } from '@/features/projects/queries';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Projects' };
export const dynamic = 'force-dynamic';

export default async function ProjectsPage({ searchParams }: PageProps<'/projects'>) {
  const user = await requireUser();
  const params = await searchParams;
  const segmentSlug = typeof params.segment === 'string' ? params.segment : undefined;
  const showAll = params.status === 'all';

  const [segments, goalOptions, prefs] = await Promise.all([
    listSegments(user.id),
    listGoalOptions(user.id),
    getPreferences(user.id),
  ]);
  const segment = segments.find((s) => s.slug === segmentSlug);
  const projects = await listProjects(user.id, {
    lifeSegmentId: segment?.id,
    status: showAll ? 'all' : 'active',
  });
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const toggleHref = (() => {
    const p = new URLSearchParams();
    if (segment) p.set('segment', segment.slug);
    if (!showAll) p.set('status', 'all');
    const qs = p.toString();
    return qs ? `/projects?${qs}` : '/projects';
  })();

  return (
    <>
      <PageHeader
        title="Projects"
        description="Defined bodies of work with an end. Each one can support several goals."
        actions={
          <>
            <Link
              href={toggleHref}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {showAll ? 'Active only' : 'Include finished'}
            </Link>
            <ProjectFormDialog
              segments={segments}
              goalOptions={goalOptions}
              defaults={{ lifeSegmentId: segment?.id }}
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  New project
                </>
              }
            />
          </>
        }
      />
      <SegmentFilter
        basePath="/projects"
        segments={segments}
        current={segment?.slug}
        extra={{ status: showAll ? 'all' : undefined }}
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title="No projects here yet"
          description="A project is worth creating when the work needs real planning."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} todayKey={todayKey} />
          ))}
        </div>
      )}
    </>
  );
}
