import Link from 'next/link';
import { TargetIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { GoalCard } from '@/features/goals/components/goal-card';
import { TaskPreviewList } from '@/features/life-segments/components/task-preview-list';
import { ProjectCard } from '@/features/projects/components/project-card';
import { cn } from '@/lib/utils';
import type { QuarterData } from '../queries';
import { MilestoneRows } from './milestone-rows';
import { PeriodStats } from './period-stats';

export function QuarterView({ data }: { data: QuarterData }) {
  const { range, todayKey } = data;
  return (
    <>
      <PeriodStats stats={data.stats} review={data.review} reviewLabel="Retrospective" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Objectives</CardTitle>
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.objectives.length === 0 && data.undated.length === 0 ? (
              <EmptyState
                icon={TargetIcon}
                title={`No quarterly objectives for ${range.label}`}
                description="Quarterly goals with a target date in this quarter appear here, with their progress."
                action={
                  <Link href="/goals" className={cn(buttonVariants({ size: 'sm' }))}>
                    Plan the quarter
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.objectives.map((g) => (
                  <GoalCard key={g.id} goal={g} todayKey={todayKey} />
                ))}
              </div>
            )}
            {data.undated.length > 0 && (
              <p className="text-muted-foreground text-sm">
                Without a target date:{' '}
                {data.undated.map((g, i) => (
                  <span key={g.id}>
                    {i > 0 && ', '}
                    <Link href={`/goals/${g.id}`} className="underline-offset-4 hover:underline">
                      {g.title}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Retrospective</CardTitle>
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              What went well, what did not, and what to prioritise next quarter.
            </p>
            <Link
              href={data.review ? `/reviews/${data.review.id}` : '/reviews'}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'self-start')}
            >
              {data.review
                ? data.review.completedAt
                  ? 'Read the quarterly review'
                  : 'Continue the quarterly review'
                : 'Open the quarterly review'}
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Month by month</CardTitle>
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.months.map((m) => (
                <div key={m.key} className="bg-muted/30 flex flex-col gap-2 rounded-lg p-3">
                  <h3 className="font-heading text-base">
                    <Link href={`/month?month=${m.key}`} className="hover:underline">
                      {m.label}
                    </Link>
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {m.milestones} milestones · {m.tasksOpen} tasks open · {m.tasksDone} done
                  </p>
                  {m.goals.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No monthly goals.</p>
                  ) : (
                    <ul className="flex flex-col gap-1 text-sm">
                      {m.goals.map((g) => (
                        <li key={g.id} className="flex items-center justify-between gap-2">
                          <Link
                            href={`/goals/${g.id}`}
                            className="truncate underline-offset-4 hover:underline"
                          >
                            {g.title}
                          </Link>
                          <span className="text-muted-foreground text-xs">{g.progress}%</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Milestones this quarter</CardTitle>
            </h2>
          </CardHeader>
          <CardContent>
            <MilestoneRows
              milestones={data.milestones}
              todayKey={todayKey}
              emptyText="No milestones fall in this quarter."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Projects in play</CardTitle>
            </h2>
          </CardHeader>
          <CardContent>
            {data.projects.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No project starts, due dates or milestones in this quarter.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.projects.map((p) => (
                  <ProjectCard key={p.id} project={p} todayKey={todayKey} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Deadlines</CardTitle>
            </h2>
          </CardHeader>
          <CardContent>
            <TaskPreviewList
              tasks={data.deadlines}
              todayKey={todayKey}
              allHref="/tasks"
              limit={12}
              emptyTitle="No tasks are due this quarter"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
