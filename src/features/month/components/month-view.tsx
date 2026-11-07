import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  ActivityIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListChecksIcon,
  RotateCcwIcon,
  TargetIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentDot } from '@/components/shared/segment-badge';
import { cn } from '@/lib/utils';
import type { MonthData } from '../queries';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HORIZON_LABEL: Record<string, string> = {
  lifelong: 'Lifelong',
  annual: 'Annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
  weekly: 'Weekly',
};

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle className="font-heading flex items-center gap-2 text-lg">
          <Icon className="text-primary size-4" aria-hidden />
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

export function MonthView({ data }: { data: MonthData }) {
  const nav = cn(buttonVariants({ variant: 'outline', size: 'sm' }));
  const dayLabels = Array.from({ length: 7 }, (_, i) => DAY_LABELS[(data.weekStartsOn + i) % 7]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/month?month=${data.prevKey}`} className={nav} aria-label="Previous month">
          <ChevronLeftIcon />
        </Link>
        <Link href="/month" className={nav}>
          This month
        </Link>
        <Link href={`/month?month=${data.nextKey}`} className={nav} aria-label="Next month">
          <ChevronRightIcon />
        </Link>
        <h3 className="font-heading min-w-0 flex-1 truncate text-lg">{data.title}</h3>
        <p className="text-muted-foreground text-sm">
          {data.doneTasks} done · {data.openTasks} open
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {dayLabels.map((label) => (
                <p
                  key={label}
                  className="text-muted-foreground px-1 text-center text-[11px] font-medium"
                >
                  {label}
                </p>
              ))}
              {data.rows.flatMap((row) =>
                row.cells.map((cell) => (
                  <Link
                    key={cell.key}
                    href={`/week?date=${cell.key}`}
                    className={cn(
                      'flex min-h-16 flex-col gap-1 rounded-lg border p-1.5 text-xs transition-colors sm:min-h-20',
                      cell.inMonth
                        ? 'bg-card hover:bg-muted/60'
                        : 'text-muted-foreground/60 bg-transparent',
                      cell.isToday && 'border-primary bg-secondary/60'
                    )}
                  >
                    <span
                      className={cn('tabular-nums', cell.isToday && 'text-primary font-medium')}
                    >
                      {Number(cell.key.slice(8, 10))}
                    </span>
                    {cell.inMonth && (
                      <span className="mt-auto flex flex-wrap items-center gap-1">
                        {cell.events > 0 && (
                          <span
                            title={`${cell.events} events`}
                            className="bg-burgundy text-ivory inline-flex min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] leading-3.5"
                          >
                            {cell.events}
                          </span>
                        )}
                        {cell.tasks > 0 && (
                          <span
                            title={`${cell.tasks} tasks due`}
                            className="bg-terracotta inline-flex min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] leading-3.5 text-white"
                          >
                            {cell.tasks}
                          </span>
                        )}
                        {cell.milestones > 0 && (
                          <span
                            title={`${cell.milestones} milestones`}
                            className="text-primary text-[10px]"
                          >
                            ◆
                          </span>
                        )}
                        {data.habitCount > 0 && cell.habitsDone > 0 && (
                          <span
                            title={`${cell.habitsDone} of ${data.habitCount} habits`}
                            className={cn(
                              'ml-auto size-2 rounded-full',
                              cell.habitsDone >= data.habitCount ? 'bg-sage' : 'bg-peach'
                            )}
                          />
                        )}
                      </span>
                    )}
                  </Link>
                ))
              )}
            </div>
            <p className="text-muted-foreground mt-3 text-[11px]">
              Burgundy counts events, terracotta counts tasks due, ◆ marks milestones, the dot shows
              habits (sage when every habit was checked). Click a day for its week.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <SectionCard title="Goals this month" icon={TargetIcon}>
            {data.goals.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No monthly goals or targets.{' '}
                <Link href="/goals" className="text-primary hover:underline">
                  Open goals
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.goals.map((g) => (
                  <li key={g.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <SegmentDot accent={g.segment.accent} className="size-2" />
                      <Link href={`/goals/${g.id}`} className="flex-1 truncate hover:underline">
                        {g.title}
                      </Link>
                      <Badge variant="outline">{HORIZON_LABEL[g.horizon] ?? g.horizon}</Badge>
                    </div>
                    <ProgressBar value={g.progress} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard
            title="End-of-month review"
            icon={RotateCcwIcon}
            action={<Badge variant="outline">Release 3</Badge>}
          >
            <p className="text-muted-foreground text-sm">
              Structured monthly reviews arrive with journals and reflections.
            </p>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Milestones due" icon={TargetIcon}>
          {data.milestones.length === 0 ? (
            <p className="text-muted-foreground text-sm">No milestones fall in this month.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="text-primary" aria-hidden>
                    ◆
                  </span>
                  <span
                    className={cn('flex-1 truncate', m.completedAt && 'line-through opacity-70')}
                  >
                    {m.title}
                  </span>
                  {m.dueDate && (
                    <span className="text-muted-foreground text-xs">
                      {format(parseISO(m.dueDate), 'd MMM')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Tasks due, by week" icon={ListChecksIcon}>
          {data.tasksByWeek.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing open is due this month.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.tasksByWeek.map((w) => (
                <div key={w.start} className="flex flex-col gap-1">
                  <Link
                    href={`/week?date=${w.start}`}
                    className="tracking-eyebrow text-muted-foreground text-[10px] uppercase hover:underline"
                  >
                    {format(parseISO(w.start), 'd MMM')} – {format(parseISO(w.end), 'd MMM')}
                  </Link>
                  <ul className="flex flex-col gap-1">
                    {w.items.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <SegmentDot accent={t.segment.accent} className="size-2" />
                        <Link
                          href={`/tasks?task=${t.id}`}
                          className="flex-1 truncate hover:underline"
                        >
                          {t.title}
                        </Link>
                        {t.dueDate && (
                          <span className="text-muted-foreground text-xs">
                            {format(parseISO(t.dueDate), 'EEE d')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="Habits" icon={ActivityIcon}>
          {data.habitSummary.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No habits yet.{' '}
              <Link href="/habits" className="text-primary hover:underline">
                Add one
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {data.habitSummary.map(({ habit, checked, daysSoFar }) => (
                <li key={habit.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    <SegmentDot accent={habit.accent ?? habit.segment.accent} className="size-2" />
                    <span className="flex-1 truncate">{habit.name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {checked}/{daysSoFar} days
                    </span>
                  </div>
                  <ProgressBar
                    value={daysSoFar > 0 ? Math.round((checked / daysSoFar) * 100) : 0}
                    valueText={
                      daysSoFar > 0 ? `${Math.round((checked / daysSoFar) * 100)}%` : 'Not started'
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
