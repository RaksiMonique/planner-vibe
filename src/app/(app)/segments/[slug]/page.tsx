import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FolderKanbanIcon, PencilIcon, TargetIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentDot } from '@/components/shared/segment-badge';
import { GoalCard } from '@/features/goals/components/goal-card';
import { listGoals } from '@/features/goals/queries';
import { GoalTimeline } from '@/features/horizons/components/goal-timeline';
import { SegmentFormDialog } from '@/features/life-segments/components/segment-form-dialog';
import { TaskPreviewList } from '@/features/life-segments/components/task-preview-list';
import { getSegmentBySlug, type LifeSegment } from '@/features/life-segments/service';
import { ProjectCard } from '@/features/projects/components/project-card';
import { listProjects } from '@/features/projects/queries';
import { getPreferences } from '@/features/settings/service';
import { listTasks } from '@/features/tasks/queries';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Life Segment' };
export const dynamic = 'force-dynamic';

export default async function SegmentPage({ params }: PageProps<'/segments/[slug]'>) {
  const user = await requireUser();
  const { slug } = await params;
  let segment: LifeSegment;
  try {
    segment = await getSegmentBySlug(user.id, slug);
  } catch {
    notFound();
  }
  const [goals, projects, tasks, prefs] = await Promise.all([
    listGoals(user.id, { lifeSegmentId: segment.id }),
    listProjects(user.id, { lifeSegmentId: segment.id }),
    listTasks(user.id, { lifeSegmentId: segment.id, parentTaskId: null }),
    getPreferences(user.id),
  ]);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Life Segments', href: '/segments' }]}
        title={segment.name}
        description={segment.archivedAt ? 'This segment is archived.' : undefined}
        actions={
          <>
            <Link
              href={`/goals?segment=${segment.slug}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <TargetIcon data-icon="inline-start" />
              Goals
            </Link>
            <Link
              href={`/projects?segment=${segment.slug}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <FolderKanbanIcon data-icon="inline-start" />
              Projects
            </Link>
            <SegmentFormDialog
              segment={segment}
              variant="outline"
              trigger={
                <>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </>
              }
            />
          </>
        }
      />
      <div className="text-muted-foreground -mt-4 mb-6 flex items-center gap-2 text-sm">
        <SegmentDot accent={segment.accent} className="size-3" />
        {goals.length} active goals · {projects.length} active projects · {tasks.length} open tasks
      </div>

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h3 className="font-heading text-xl">Goals</h3>
          {goals.length === 0 ? (
            <EmptyState
              icon={TargetIcon}
              title="No active goals"
              description="Goals give this area a direction. Add one from the Goals page."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} todayKey={todayKey} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-heading text-xl">Goal timeline</h3>
          <GoalTimeline goals={goals} todayKey={todayKey} />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-heading text-xl">Projects</h3>
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanbanIcon}
              title="No active projects"
              description="Projects are defined bodies of work with an end."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} todayKey={todayKey} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-heading text-xl">Open tasks</h3>
          <TaskPreviewList
            tasks={tasks}
            todayKey={todayKey}
            allHref={`/tasks?segment=${segment.slug}`}
          />
        </section>
      </div>
    </>
  );
}
