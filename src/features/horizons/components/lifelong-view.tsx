import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Grid3x3Icon, ImagesIcon, MountainIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { GoalFormDialog } from '@/features/goals/components/goal-form-dialog';
import type { GoalOption } from '@/features/goals/queries';
import { HORIZON_LABELS } from '@/features/goals/schema';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ProjectOption } from '@/features/projects/queries';
import { cn } from '@/lib/utils';
import type { LifelongData } from '../queries';
import { GoalTimeline } from './goal-timeline';

export function LifelongView({
  data,
  segments,
  goalOptions,
  projectOptions,
}: {
  data: LifelongData;
  segments: SegmentRef[];
  goalOptions: GoalOption[];
  projectOptions: ProjectOption[];
}) {
  const { todayKey } = data;
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl">Aspirations</h2>
        {data.aspirations.length === 0 ? (
          <EmptyState
            icon={MountainIcon}
            title="No lifelong goals yet"
            description="Lifelong goals are the aspirations everything else serves. Each breaks into annual, quarterly, monthly and weekly goals."
            action={
              <GoalFormDialog
                segments={segments}
                goalOptions={goalOptions}
                projectOptions={projectOptions}
                defaults={{ horizon: 'lifelong' }}
                trigger={<>Add a lifelong goal</>}
              />
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.aspirations.map((g) => (
              <Card key={g.id}>
                <CardHeader>
                  <h3>
                    <CardTitle className="font-heading text-lg">
                      <Link href={`/goals/${g.id}`} className="hover:underline">
                        {g.title}
                      </Link>
                    </CardTitle>
                  </h3>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SegmentBadge name={g.segment.name} accent={g.segment.accent} />
                    {g.targetDate && (
                      <Badge variant="outline">
                        By {format(parseISO(g.targetDate), 'MMM yyyy')}
                      </Badge>
                    )}
                  </div>
                  <ProgressBar value={g.progress} valueText={`${g.progress}% complete`} />
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                      Next steps
                    </p>
                    {g.children.length === 0 ? (
                      <p className="text-muted-foreground">
                        Not broken down yet. Open the Mandala view to add supporting goals.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {g.children.slice(0, 4).map((c) => (
                          <li key={c.id} className="flex items-center justify-between gap-2">
                            <Link
                              href={`/goals/${c.id}`}
                              className="truncate underline-offset-4 hover:underline"
                            >
                              {c.title}
                            </Link>
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {HORIZON_LABELS[c.horizon]} · {c.progress}%
                            </span>
                          </li>
                        ))}
                        {g.children.length > 4 && (
                          <li className="text-muted-foreground text-xs">
                            and {g.children.length - 4} more
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                  {g.milestones.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {g.milestones.filter((m) => m.completedAt).length} of {g.milestones.length}{' '}
                      milestones reached
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/goals/${g.id}/mandala`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      <Grid3x3Icon data-icon="inline-start" />
                      Mandala view
                    </Link>
                    {g.boards.map((b) => (
                      <Link
                        key={b.id}
                        href={`/vision-boards/${b.id}`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                      >
                        <ImagesIcon data-icon="inline-start" />
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <h2>
            <CardTitle className="font-heading text-lg">Horizons</CardTitle>
          </h2>
        </CardHeader>
        <CardContent>
          <GoalTimeline goals={data.timelineGoals} todayKey={todayKey} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2>
            <CardTitle className="font-heading text-lg">Milestone timeline</CardTitle>
          </h2>
        </CardHeader>
        <CardContent>
          {data.milestoneTimeline.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Milestones on lifelong goals appear here in date order.
            </p>
          ) : (
            <ol className="relative flex flex-col gap-3 border-l pl-4">
              {data.milestoneTimeline.map((m) => (
                <li key={m.id} className="relative text-sm">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full border',
                      m.completedAt ? 'bg-sage border-sage' : 'bg-card border-border'
                    )}
                  />
                  <p className={m.completedAt ? 'text-muted-foreground line-through' : ''}>
                    {m.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {m.dueDate ? format(parseISO(m.dueDate), 'MMM yyyy') : 'No date'} ·{' '}
                    <Link
                      href={`/goals/${m.goalId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {m.goalTitle}
                    </Link>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {data.closed.length > 0 && (
        <Card>
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Achieved and set aside</CardTitle>
            </h2>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm">
              {data.closed.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/goals/${g.id}`}
                    className="truncate underline-offset-4 hover:underline"
                  >
                    {g.title}
                  </Link>
                  <Badge variant="secondary">
                    {g.status === 'achieved' ? 'Achieved' : 'Set aside'}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
