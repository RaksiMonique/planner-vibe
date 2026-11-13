import { ProgressBar } from '@/components/shared/progress-bar';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { listGoalOptions, listGoals, listMilestones } from '@/features/goals/queries';
import { listLinkedGoalIds } from '@/features/goals/service';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { TaskPreviewList } from '@/features/life-segments/components/task-preview-list';
import { listSegments } from '@/features/life-segments/service';
import { MilestoneList } from '@/features/milestones/components/milestone-list';
import { deleteProjectAction } from '@/features/projects/actions';
import { LinkedGoals } from '@/features/projects/components/linked-goals';
import { ProjectFormDialog } from '@/features/projects/components/project-form-dialog';
import { getProject, listProjectOptions } from '@/features/projects/queries';
import { PROJECT_STATUS_LABELS } from '@/features/projects/schema';
import { getPreferences } from '@/features/settings/service';
import { listTasks } from '@/features/tasks/queries';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';

export const metadata: Metadata = { title: 'Project' };
export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: PageProps<'/projects/[id]'>) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProject(user.id, id);
  if (!project) notFound();

  const [milestones, segments, goalOptions, openProjects, allGoals, linkedIds, tasks, prefs] =
    await Promise.all([
      listMilestones(user.id, { projectId: id }),
      listSegments(user.id),
      listGoalOptions(user.id),
      listProjectOptions(user.id),
      listGoals(user.id, { status: 'all' }),
      listLinkedGoalIds(user.id, id),
      listTasks(user.id, { projectId: id, status: 'all' }),
      getPreferences(user.id),
    ]);
  const linkedGoals = allGoals.filter((g) => linkedIds.includes(g.id));
  // A new goal started here must be able to tick this project even once it is done.
  const projectOptions = openProjects.some((p) => p.id === project.id)
    ? openProjects
    : [
        { id: project.id, title: project.title, lifeSegmentId: project.lifeSegmentId },
        ...openProjects,
      ];
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const closed = project.status === 'done' || project.status === 'archived';
  const overdue = !closed && project.dueDate !== null && project.dueDate < todayKey;
  const openTasks = tasks.filter((t) => t.status !== 'done');

  return (
    <>
      <PageHeader
        title={project.title}
        actions={
          <>
            <ProjectFormDialog
              segments={segments}
              goalOptions={goalOptions}
              project={project}
              linkedGoalIds={linkedIds}
              variant="outline"
              trigger={
                <>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </>
              }
            />
            <ConfirmActionButton
              action={deleteProjectAction}
              fields={{ id: project.id }}
              title="Delete this project?"
              description="Its tasks stay in Tasks and keep their Life Segment. The project itself is hidden."
              trigger={
                <>
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </>
              }
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <SegmentBadge name={project.segment.name} accent={project.segment.accent} />
              <Badge variant={closed ? 'secondary' : 'outline'}>
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
              {project.startDate && (
                <Badge variant="outline">
                  From {format(parseISO(project.startDate), 'd MMM yyyy')}
                </Badge>
              )}
              {project.dueDate && (
                <Badge variant={overdue ? 'destructive' : 'outline'}>
                  Due {format(parseISO(project.dueDate), 'd MMM yyyy')}
                </Badge>
              )}
            </div>
            <ProgressBar
              value={project.progress}
              valueClassName="text-sm"
              valueText={
                project.taskTotal > 0
                  ? `${project.progress}% · ${project.taskDone} of ${project.taskTotal} tasks done`
                  : `${project.progress}% complete`
              }
            />
            {project.description ? (
              <p className="text-sm whitespace-pre-line">{project.description}</p>
            ) : (
              <p className="text-muted-foreground text-sm">No description.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <LinkedGoals
              projectId={project.id}
              lifeSegmentId={project.lifeSegmentId}
              linked={linkedGoals}
              options={goalOptions}
              segments={segments}
              projectOptions={projectOptions}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskPreviewList
              tasks={openTasks}
              todayKey={todayKey}
              allHref={`/tasks?project=${project.id}`}
              emptyTitle="No open tasks in this project"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <MilestoneList milestones={milestones} projectId={project.id} todayKey={todayKey} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
