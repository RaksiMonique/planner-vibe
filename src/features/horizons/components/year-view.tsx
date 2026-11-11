import Link from 'next/link';
import { TargetIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { ProgressBar } from '@/components/shared/progress-bar';
import { GoalCard } from '@/features/goals/components/goal-card';
import { cn } from '@/lib/utils';
import type { YearData } from '../queries';
import { MilestoneRows } from './milestone-rows';
import { PeriodStats } from './period-stats';

export function YearView({ data }: { data: YearData }) {
  const { todayKey } = data;
  return (
    <>
      <PeriodStats stats={data.stats} review={data.review} reviewLabel="Yearly reflection" />
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
                title={`No annual objectives for ${data.range.key}`}
                description="Annual goals with a target date in this year appear here."
                action={
                  <Link href="/goals" className={cn(buttonVariants({ size: 'sm' }))}>
                    Plan the year
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
              <CardTitle className="font-heading text-lg">Yearly reflection</CardTitle>
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              What did the year accomplish, which goals progressed, and what comes next.
            </p>
            <Link
              href={data.review ? `/reviews/${data.review.id}` : '/reviews'}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'self-start')}
            >
              {data.review
                ? data.review.completedAt
                  ? 'Read the annual review'
                  : 'Continue the annual review'
                : 'Open the annual review'}
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Year at a glance</CardTitle>
            </h2>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {data.months.map((m) => (
                <li key={m.key}>
                  <Link
                    href={`/month?month=${m.key}`}
                    className={cn(
                      'bg-muted/30 hover:bg-muted/60 block rounded-lg p-3 transition-colors',
                      m.isCurrent && 'ring-primary ring-2'
                    )}
                  >
                    <span className="font-heading block text-base">{m.label}</span>
                    <span className="text-muted-foreground block text-xs">{m.events} events</span>
                    <span className="text-muted-foreground block text-xs">
                      {m.milestones} milestones · {m.tasks} tasks
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Quarter by quarter</CardTitle>
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.quarters.map((q) => (
                <div
                  key={q.range.key}
                  className={cn(
                    'bg-muted/30 flex flex-col gap-2 rounded-lg p-3',
                    q.isCurrent && 'ring-primary ring-2'
                  )}
                >
                  <h3 className="font-heading text-base">
                    <Link href={`/quarter?quarter=${q.range.key}`} className="hover:underline">
                      {q.range.label}
                    </Link>
                  </h3>
                  <ProgressBar
                    value={q.progress}
                    valueText={`${q.progress}%`}
                    valueClassName="text-xs"
                  />
                  <p className="text-muted-foreground text-xs">
                    {q.goals.length} objectives · {q.milestones} milestones
                  </p>
                  {q.goals.length > 0 && (
                    <ul className="flex flex-col gap-1 text-sm">
                      {q.goals.slice(0, 4).map((g) => (
                        <li key={g.id}>
                          <Link
                            href={`/goals/${g.id}`}
                            className="block truncate underline-offset-4 hover:underline"
                          >
                            {g.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Milestones this year</CardTitle>
            </h2>
          </CardHeader>
          <CardContent>
            <MilestoneRows
              milestones={data.milestones}
              todayKey={todayKey}
              emptyText="No milestones fall in this year."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
