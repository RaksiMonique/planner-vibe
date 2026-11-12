import { ProgressBar } from '@/components/shared/progress-bar';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ChevronRightIcon, Grid3x3Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { deleteGoalAction } from '@/features/goals/actions';
import { GoalCard } from '@/features/goals/components/goal-card';
import { GoalFormDialog } from '@/features/goals/components/goal-form-dialog';
import { LinkedProjects } from '@/features/goals/components/linked-projects';
import { buildAncestorChain } from '@/features/goals/grouping';
import { getGoal, listGoalOptions, listGoals, listMilestones } from '@/features/goals/queries';
import { GOAL_STATUS_LABELS, HORIZON_LABELS } from '@/features/goals/schema';
import { listLinkedProjectIds } from '@/features/goals/service';
import { GoalTimeline } from '@/features/horizons/components/goal-timeline';
import { collectSubtree } from '@/features/horizons/timeline';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { TaskPreviewList } from '@/features/life-segments/components/task-preview-list';
import { listSegments } from '@/features/life-segments/service';
import { MilestoneList } from '@/features/milestones/components/milestone-list';
import { listProjectOptions, listProjects } from '@/features/projects/queries';
import { getPreferences } from '@/features/settings/service';
import { listTasks } from '@/features/tasks/queries';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Goal' };
export const dynamic = 'force-dynamic';

export default async function GoalPage({ params }: PageProps<'/goals/[id]'>) {
  const user = await requireUser();
  const { id } = await params;
  const goal = await getGoal(user.id, id);
  if (!goal) notFound();

  const [
    allGoals,
    children,
    milestones,
    segments,
    goalOptions,
    projectOptions,
    allProjects,
    linkedIds,
    tasks,
    prefs,
  ] = await Promise.all([
    listGoals(user.id, { status: 'all' }),
    listGoals(user.id, { parentGoalId: id, status: 'all' }),
    listMilestones(user.id, { goalId: id }),
    listSegments(user.id),
    listGoalOptions(user.id),
    listProjectOptions(user.id),
    listProjects(user.id, { status: 'all' }),
    listLinkedProjectIds(user.id, id),
    listTasks(user.id, { goalId: id }),
    getPreferences(user.id),
  ]);
  const ancestors = buildAncestorChain(id, allGoals);
  const subtree = collectSubtree(id, allGoals);
  const horizonGoals = [...ancestors, ...subtree];
  const linkedProjects = allProjects.filter((p) => linkedIds.includes(p.id));
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const closed = goal.status === 'achieved' || goal.status === 'abandoned';
  const overdue = !closed && goal.targetDate !== null && goal.targetDate < todayKey;

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-2 flex flex-wrap items-center gap-1 text-xs"
      >
        <Link href="/goals" className="hover:underline">
          Goals
        </Link>
        {ancestors.map((a) => (
          <span key={a.id} className="flex items-center gap-1">
            <ChevronRightIcon className="size-3" aria-hidden />
            <Link href={`/goals/${a.id}`} className="hover:underline">
              {a.title}
            </Link>
          </span>
        ))}
      </nav>
      <PageHeader
        eyebrow={HORIZON_LABELS[goal.horizon]}
        title={goal.title}
        actions={
          <>
            <Link
              href={`/goals/${goal.id}/mandala`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Grid3x3Icon data-icon="inline-start" />
              Mandala
            </Link>
            <GoalFormDialog
              segments={segments}
              goalOptions={goalOptions}
              projectOptions={projectOptions}
              goal={goal}
              linkedProjectIds={linkedIds}
              variant="outline"
              trigger={
                <>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </>
              }
            />
            <ConfirmActionButton
              action={deleteGoalAction}
              fields={{ id: goal.id }}
              title="Delete this goal?"
              description="Its sub-goals become top-level goals. Milestones and links are kept with the goal and hidden."
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
              <SegmentBadge name={goal.segment.name} accent={goal.segment.accent} />
              <Badge variant={closed ? 'secondary' : 'outline'}>
                {GOAL_STATUS_LABELS[goal.status]}
              </Badge>
              {goal.targetDate && (
                <Badge variant={overdue ? 'destructive' : 'outline'}>
                  Target {format(parseISO(goal.targetDate), 'd MMM yyyy')}
                </Badge>
              )}
            </div>
            <ProgressBar
              value={goal.progress}
              valueText={`${goal.progress}% complete`}
              valueClassName="text-sm"
            />
            {goal.targetValue !== null && Number(goal.targetValue) > 0 && (
              <p className="text-muted-foreground text-sm">
                {Number(goal.currentValue ?? 0)} of {Number(goal.targetValue)} {goal.unit ?? ''}
              </p>
            )}
            {goal.description ? (
              <p className="text-sm whitespace-pre-line">{goal.description}</p>
            ) : (
              <p className="text-muted-foreground text-sm">No description.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <MilestoneList milestones={milestones} goalId={goal.id} todayKey={todayKey} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="items-center">
            <CardTitle className="font-heading text-lg">Sub-goals</CardTitle>
            {goal.horizon !== 'weekly' && (
              <div className="col-start-2 row-start-1 justify-self-end">
                <GoalFormDialog
                  segments={segments}
                  goalOptions={goalOptions}
                  projectOptions={projectOptions}
                  defaults={{ parentGoalId: goal.id, lifeSegmentId: goal.lifeSegmentId }}
                  variant="outline"
                  trigger={
                    <>
                      <PlusIcon data-icon="inline-start" />
                      Add sub-goal
                    </>
                  }
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Break this goal into shorter horizons to track it week by week.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {children.map((c) => (
                  <GoalCard key={c.id} goal={c} todayKey={todayKey} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <LinkedProjects
              goalId={goal.id}
              lifeSegmentId={goal.lifeSegmentId}
              linked={linkedProjects}
              options={projectOptions}
              segments={segments}
              goalOptions={goalOptions}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Horizons</CardTitle>
            </h2>
          </CardHeader>
          <CardContent>
            <GoalTimeline goals={horizonGoals} todayKey={todayKey} highlightId={goal.id} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Tasks working towards this goal</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskPreviewList
              tasks={tasks}
              todayKey={todayKey}
              allHref={`/tasks?goal=${goal.id}`}
              emptyTitle="No tasks linked yet"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
