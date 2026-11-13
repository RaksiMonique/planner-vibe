import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, TargetIcon, ListChecksIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoalProgress } from '@/features/goals/components/goal-progress';
import { SegmentDot } from '@/components/shared/segment-badge';
import { cn } from '@/lib/utils';
import type { WeekData, WeekDay } from '../queries';
import { HabitToggle, RoutineStepToggle, TaskToggle } from './week-toggles';

const HORIZON_LABEL: Record<string, string> = {
  lifelong: 'Lifelong',
  annual: 'Annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
  weekly: 'Weekly',
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="tracking-eyebrow text-muted-foreground text-[10px] uppercase">{label}</p>
      {children}
    </div>
  );
}

function DayCard({ day }: { day: WeekDay }) {
  const date = parseISO(day.key);
  const empty =
    day.events.length +
      day.blocks.length +
      day.tasks.length +
      day.milestones.length +
      day.routines.length ===
    0;
  return (
    <Card
      size="sm"
      className={cn(
        'h-full',
        day.isToday && 'ring-primary ring-2',
        day.isPast && !day.isToday && 'opacity-80'
      )}
    >
      <CardHeader className="items-center">
        <CardTitle className={cn('font-heading text-base', day.isToday && 'text-primary')}>
          <Link href={`/calendar?date=${day.key}`} className="hover:underline">
            {format(date, 'EEE d')}
          </Link>
        </CardTitle>
        {day.isToday && <Badge variant="secondary">Today</Badge>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {day.events.length > 0 && (
          <Section label="Events">
            <ul className="flex flex-col gap-0.5">
              {day.events.map((e) => (
                <li key={e.id} className="flex items-center gap-1.5 text-xs">
                  <SegmentDot accent={e.accent} className="size-2" />
                  {e.time && <span className="text-muted-foreground tabular-nums">{e.time}</span>}
                  <span className="truncate">{e.title}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {day.blocks.length > 0 && (
          <Section label="Time blocks">
            <ul className="flex flex-col gap-0.5">
              {day.blocks.map((b) => (
                <li key={b.id} className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <SegmentDot accent={b.accent} className="size-2" />
                  <span className="tabular-nums">
                    {b.start}–{b.end}
                  </span>
                  <Link href="/time" className="truncate hover:underline">
                    {b.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {(day.tasks.length > 0 || day.milestones.length > 0) && (
          <Section label="Due">
            <ul className="flex flex-col gap-1">
              {day.milestones.map((m) => (
                <li key={m.id} className="text-primary flex items-center gap-1.5 text-xs">
                  <span aria-hidden>◆</span>
                  <span className={cn('truncate', m.completedAt && 'line-through opacity-70')}>
                    {m.title}
                  </span>
                </li>
              ))}
              {day.tasks.map((t) => (
                <li key={t.id}>
                  <TaskToggle
                    id={t.id}
                    title={t.title}
                    done={t.status === 'done'}
                    accent={t.segment.accent}
                  />
                </li>
              ))}
            </ul>
          </Section>
        )}
        {day.routines.length > 0 && (
          <Section label="Routines">
            <ul className="flex flex-col gap-2">
              {day.routines.map(({ routine, doneStepIds }) => (
                <li key={routine.id} className="flex flex-col gap-1">
                  <p className="flex items-center justify-between text-xs font-medium">
                    <Link href="/routines" className="truncate hover:underline">
                      {routine.name}
                    </Link>
                    <span className="text-muted-foreground tabular-nums">
                      {routine.steps.filter((s) => doneStepIds.includes(s.id)).length}/
                      {routine.steps.length}
                    </span>
                  </p>
                  <ul className="flex flex-col gap-0.5 pl-1">
                    {routine.steps.map((s) => (
                      <li key={s.id}>
                        <RoutineStepToggle
                          routineId={routine.id}
                          stepId={s.id}
                          dateKey={day.key}
                          title={s.title}
                          done={doneStepIds.includes(s.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {day.habits.length > 0 && (
          <Section label="Habits">
            <ul className="flex flex-col gap-1">
              {day.habits.map(({ habit, done }) => (
                <li key={habit.id}>
                  <HabitToggle
                    habitId={habit.id}
                    dateKey={day.key}
                    name={habit.name}
                    done={done}
                    accent={habit.accent ?? habit.segment.accent}
                  />
                </li>
              ))}
            </ul>
          </Section>
        )}
        {empty && day.habits.length === 0 && (
          <p className="text-muted-foreground text-xs">Nothing planned.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function WeekView({ data }: { data: WeekData }) {
  const nav = cn(buttonVariants({ variant: 'outline', size: 'sm' }));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/week?date=${data.prevKey}`} className={nav} aria-label="Previous week">
          <ChevronLeftIcon />
        </Link>
        <Link href="/week" className={nav}>
          This week
        </Link>
        <Link href={`/week?date=${data.nextKey}`} className={nav} aria-label="Next week">
          <ChevronRightIcon />
        </Link>
        <h3 className="font-heading min-w-0 flex-1 truncate text-lg">{data.title}</h3>
        <p className="text-muted-foreground text-sm">
          {data.doneCount} done · {data.openCount} open
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-lg">
              <ListChecksIcon className="text-primary size-4" aria-hidden />
              Priorities this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.priorities.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Mark tasks as important and they gather here.{' '}
                <Link href="/tasks" className="text-primary hover:underline">
                  Open tasks
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {data.priorities.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <TaskToggle id={t.id} title={t.title} done={false} accent={t.segment.accent} />
                    {t.dueDate && (
                      <span className="text-muted-foreground ml-auto text-xs">
                        {format(parseISO(t.dueDate), 'EEE')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-lg">
              <TargetIcon className="text-primary size-4" aria-hidden />
              Goals in play
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.goals.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No weekly goals or targets this week.{' '}
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
                    <GoalProgress progress={g.progress} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {data.days.map((day) => (
          <DayCard key={day.key} day={day} />
        ))}
      </div>
    </div>
  );
}
