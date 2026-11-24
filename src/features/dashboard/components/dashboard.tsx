import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  CalendarDaysIcon,
  ChartPieIcon,
  InboxIcon,
  CheckIcon,
  PlusIcon,
  QuoteIcon,
  Settings2Icon,
  TargetIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import { Inbox } from '@/features/capture/components/inbox';
import { QuickCapture } from '@/features/capture/components/quick-capture';
import { JobScheduleCard } from '@/features/work/components/job-schedule-card';
import { ACCENT_BG } from '@/lib/accents';
import { GoalProgress } from '@/features/goals/components/goal-progress';
import { SomedayDashboardCard } from '@/features/goals/components/someday-dashboard-card';
import { cn } from '@/lib/utils';
import type { DashboardLayout, EnabledModules } from '@/db/schema';
import { normaliseLayout, visibleCards, type DashboardCardKey } from '../layout';
import { AddCards, CardControls } from './customise';
import type { DashboardData } from '../queries';
import { BibleDashboardCard } from '@/features/faith/components/bible-dashboard-card';
import { PrayerDashboardCard } from '@/features/faith/components/prayer-dashboard-card';
import { ScriptureDashboardCard } from '@/features/faith/components/scripture-dashboard-card';
import { StudyDashboardCard } from '@/features/study/components/study-dashboard-card';
import { ReadingDashboardCard } from '@/features/media/components/reading-dashboard-card';
import { HabitsDashboardCard } from '@/features/habits/components/habits-dashboard-card';
import { JournalDashboardCard } from '@/features/journal/components/journal-dashboard-card';
import { MoodDashboardCard } from '@/features/wellness/components/mood-dashboard-card';
import { SelfCareDashboardCard } from '@/features/wellness/components/self-care-dashboard-card';
import { FitnessDashboardCard } from '@/features/wellness/components/fitness-dashboard-card';
import { WellnessJournalDashboardCard } from '@/features/wellness/components/wellness-journal-dashboard-card';
import { MoodTrendDashboardCard } from '@/features/wellness/components/mood-trend-dashboard-card';
import { RoutinesDashboardCard } from '@/features/routines/components/routines-dashboard-card';
import { TimeDashboardCard } from '@/features/time/components/time-dashboard-card';
import { ProjectsDashboardCard } from '@/features/projects/components/projects-dashboard-card';
import { SegmentSpotlightDashboardCard } from '@/features/life-segments/components/segment-spotlight-card';
import { MonthGlanceDashboardCard } from '@/features/month/components/month-glance-card';
import { QuarterFocusDashboardCard } from '@/features/horizons/components/quarter-focus-card';
import { WaitingDashboardCard } from '@/features/tasks/components/waiting-dashboard-card';
import { CompletedDashboardCard } from '@/features/tasks/components/completed-dashboard-card';
import { CountdownsDashboardCard } from '@/features/calendar/components/countdowns-dashboard-card';
import { MealsDashboardCard } from '@/features/meals/components/meals-dashboard-card';
import { GroceriesDashboardCard } from '@/features/meals/components/groceries-dashboard-card';
import { MediaDashboardCard } from '@/features/media/components/media-dashboard-card';
import { GiftsDashboardCard } from '@/features/gifts/components/gifts-dashboard-card';
import { VisionDashboardCard } from '@/features/vision/components/vision-dashboard-card';
import { WorkProjectsDashboardCard } from '@/features/work/components/work-projects-dashboard-card';
import { WorkTasksDashboardCard } from '@/features/work/components/work-tasks-dashboard-card';
import { WorkHoursDashboardCard } from '@/features/work/components/work-hours-dashboard-card';
import { ReviewDashboardCard } from '@/features/reviews/components/review-dashboard-card';
import { JournalStreakDashboardCard } from '@/features/journal/components/journal-streak-dashboard-card';
import { NotesDashboardCard } from '@/features/notes/components/notes-dashboard-card';
import { FinanceDashboardCard } from '@/features/finance/components/finance-dashboard-card';
import { ImportantDashboardCard } from '@/features/important/components/important-dashboard-card';
import { WeekStatsDashboardCard } from '@/features/analytics/components/week-stats-dashboard-card';
import { DashboardCard, EmptyNote } from './dashboard-card';
import { TodayBlock } from './today-block';

const HORIZON_LABEL = {
  lifelong: 'Lifelong',
  annual: 'Annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
  weekly: 'Weekly',
} as const;

export function Dashboard({
  data,
  timeZone,
  userId,
  layout,
  enabledModules,
  customising = false,
}: {
  data: DashboardData;
  timeZone: string;
  userId: string;
  layout: DashboardLayout | null;
  enabledModules: EnabledModules;
  /** Edit mode: move and hide cards in place (instructions.md 7.5). */
  customising?: boolean;
}) {
  const timeOf = (startsAt: Date | null) =>
    startsAt ? format(toZonedTime(startsAt, timeZone), 'HH:mm') : '';

  // Every optional card takes the same props and fetches its own data.
  const cardProps = {
    userId,
    todayKey: data.todayKey,
    timeZone,
    weekStartsOn: data.weekStartsOn,
  };
  const one = (node: React.ReactNode) => ({ span: 'lg:col-span-1', node });

  const cards: Record<DashboardCardKey, { span: string; node: React.ReactNode } | null> = {
    job: data.workDays
      ? {
          span: 'lg:col-span-1',
          node: <JobScheduleCard days={data.workDays} />,
        }
      : null,
    routines: {
      span: 'lg:col-span-1',
      node: <RoutinesDashboardCard userId={userId} todayKey={data.todayKey} />,
    },
    habits: {
      span: 'lg:col-span-1',
      node: <HabitsDashboardCard userId={userId} todayKey={data.todayKey} />,
    },
    time: {
      span: 'lg:col-span-1',
      node: (
        <TimeDashboardCard
          userId={userId}
          todayKey={data.todayKey}
          weekStartsOn={data.weekStartsOn}
          timeZone={timeZone}
        />
      ),
    },
    faith: {
      span: 'lg:col-span-1',
      node: <BibleDashboardCard userId={userId} todayKey={data.todayKey} />,
    },
    prayer: one(<PrayerDashboardCard {...cardProps} />),
    scripture: one(<ScriptureDashboardCard {...cardProps} />),
    study: one(<StudyDashboardCard {...cardProps} />),
    reading: one(<ReadingDashboardCard {...cardProps} />),
    'self-care': one(<SelfCareDashboardCard {...cardProps} />),
    fitness: one(<FitnessDashboardCard {...cardProps} />),
    'wellness-journal': one(<WellnessJournalDashboardCard {...cardProps} />),
    'mood-trend': one(<MoodTrendDashboardCard {...cardProps} />),
    projects: one(<ProjectsDashboardCard {...cardProps} />),
    someday: one(<SomedayDashboardCard {...cardProps} />),
    spotlight: one(<SegmentSpotlightDashboardCard {...cardProps} />),
    month: one(<MonthGlanceDashboardCard {...cardProps} />),
    quarter: one(<QuarterFocusDashboardCard {...cardProps} />),
    waiting: one(<WaitingDashboardCard {...cardProps} />),
    completed: one(<CompletedDashboardCard {...cardProps} />),
    countdowns: one(<CountdownsDashboardCard {...cardProps} />),
    meals: one(<MealsDashboardCard {...cardProps} />),
    groceries: one(<GroceriesDashboardCard {...cardProps} />),
    media: one(<MediaDashboardCard {...cardProps} />),
    gifts: one(<GiftsDashboardCard {...cardProps} />),
    vision: one(<VisionDashboardCard {...cardProps} />),
    'work-projects': one(<WorkProjectsDashboardCard {...cardProps} />),
    'work-tasks': one(<WorkTasksDashboardCard {...cardProps} />),
    'work-hours': one(<WorkHoursDashboardCard {...cardProps} />),
    review: one(<ReviewDashboardCard {...cardProps} />),
    'journal-streak': one(<JournalStreakDashboardCard {...cardProps} />),
    notes: one(<NotesDashboardCard {...cardProps} />),
    finance: one(<FinanceDashboardCard {...cardProps} />),
    important: one(<ImportantDashboardCard {...cardProps} />),
    stats: one(<WeekStatsDashboardCard {...cardProps} />),
    journal: {
      span: 'lg:col-span-1',
      node: <JournalDashboardCard userId={userId} todayKey={data.todayKey} />,
    },
    mood: {
      span: 'lg:col-span-1',
      node: <MoodDashboardCard userId={userId} todayKey={data.todayKey} />,
    },
    week: {
      span: 'lg:col-span-3',
      node: (
        <DashboardCard title="Weekly schedule" icon={CalendarDaysIcon} href="/calendar" release={1}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {data.week.map((day) => (
              <Link
                key={day.key}
                href={`/calendar?date=${day.key}`}
                className={cn(
                  'hover:bg-muted/50 flex min-h-28 flex-col gap-1 rounded-lg border p-2',
                  day.isToday ? 'border-primary bg-secondary/60' : 'bg-card'
                )}
              >
                <p
                  className={cn(
                    'text-xs font-medium',
                    day.isToday ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {format(parseISO(day.key), 'EEE d')}
                </p>
                {day.events.map((e) => (
                  <p key={e.id} className="truncate text-[11px]" title={e.title}>
                    {!e.isAllDay && (
                      <span className="text-muted-foreground">{timeOf(e.startsAt)} </span>
                    )}
                    {e.title}
                  </p>
                ))}
                {day.milestones.map((m) => (
                  <p key={m.id} className="text-primary truncate text-[11px]" title={m.title}>
                    ◆ {m.title}
                  </p>
                ))}
                {day.tasks.map((t) => (
                  <p
                    key={t.id}
                    className="flex items-center gap-1 truncate text-[11px]"
                    title={t.title}
                  >
                    <span
                      className={cn('size-1.5 shrink-0 rounded-full', ACCENT_BG[t.segment.accent])}
                    />
                    <span className="truncate">{t.title}</span>
                  </p>
                ))}
              </Link>
            ))}
          </div>
        </DashboardCard>
      ),
    },
    goals: {
      span: 'lg:col-span-1',
      node: (
        <DashboardCard title="Active goals" icon={TargetIcon} href="/goals" release={1}>
          {data.goals.length === 0 && (
            <EmptyNote>No active goals yet. Start with a lifelong one.</EmptyNote>
          )}
          <ul className="flex flex-col gap-3">
            {data.goals.map((g) => (
              <li key={g.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <SegmentDot accent={g.segment.accent} />
                  <Link href={`/goals/${g.id}`} className="link flex-1 truncate text-sm">
                    {g.title}
                  </Link>
                  <Badge variant="outline">{HORIZON_LABEL[g.horizon]}</Badge>
                </div>
                <GoalProgress progress={g.progress} />
              </li>
            ))}
          </ul>
        </DashboardCard>
      ),
    },
    inbox: {
      span: 'lg:col-span-1',
      node: (
        <DashboardCard title="Inbox" icon={InboxIcon} href="/tasks" release={1}>
          <Inbox captures={data.captures.slice(0, 6)} segments={data.segments} />
          {data.captures.length > 6 && (
            <Link href="/tasks" className="text-primary link text-xs">
              {data.captures.length - 6} more in the inbox
            </Link>
          )}
        </DashboardCard>
      ),
    },
    quote: {
      span: 'lg:col-span-1',
      node: (
        <Card className="bg-secondary h-full ring-0">
          <CardContent className="h-full py-4">
            <figure
              aria-label="Quote of the day"
              className="flex h-full flex-col justify-center gap-3"
            >
              <QuoteIcon className="text-primary size-5" aria-hidden />
              <blockquote className="font-heading text-secondary-foreground text-lg leading-snug">
                {data.quote.quote}
              </blockquote>
              <figcaption className="text-muted-foreground text-xs">{data.quote.author}</figcaption>
              {data.quote.why && (
                <p className="text-muted-foreground border-primary/40 border-l-2 pl-2 text-xs">
                  {data.quote.why}
                </p>
              )}
            </figure>
          </CardContent>
        </Card>
      ),
    },
    segments: {
      span: 'lg:col-span-3',
      node: (
        <DashboardCard title="Life Segments" icon={ChartPieIcon} href="/segments" release={1}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {data.segments.map((s) => (
              <Link
                key={s.id}
                href={`/segments/${s.slug}`}
                className="bg-card hover:bg-muted/50 flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <SegmentDot accent={s.accent} className="size-3" />
                <span className="flex-1 truncate text-sm">{s.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{s.openTasks}</span>
              </Link>
            ))}
          </div>
        </DashboardCard>
      ),
    },
  };
  const order = visibleCards(layout, enabledModules);
  const shown = order.filter((card) => cards[card.key]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard?new=task"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <PlusIcon data-icon="inline-start" />
          Task
        </Link>
        <Link
          href="/dashboard?new=event"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <PlusIcon data-icon="inline-start" />
          Event
        </Link>
        {customising ? (
          <Link href="/dashboard" className={cn(buttonVariants({ size: 'sm' }))}>
            <CheckIcon data-icon="inline-start" />
            Done
          </Link>
        ) : (
          <Link
            href="/dashboard?customise=1"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            <Settings2Icon data-icon="inline-start" />
            Customise
          </Link>
        )}
        <div className="ml-auto w-full sm:w-auto">
          <QuickCapture />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardContent className="flex flex-col gap-2 py-2">
            <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">
              {data.dateLabel}
            </p>
            <h2 className="font-heading text-3xl">
              {data.greeting}, {data.name}
            </h2>
            <p className="text-muted-foreground text-sm">
              {data.priorities.length} to focus on today, {data.dueThisWeek.length} more this week,{' '}
              {data.overdue.length} overdue.
              {data.doneTodayCount > 0 && ` ${data.doneTodayCount} done today.`}
            </p>
          </CardContent>
        </Card>
        <TodayBlock
          userId={userId}
          todayKey={data.todayKey}
          timeZone={timeZone}
          weekStartsOn={data.weekStartsOn}
          habitsEnabled={enabledModules.habits !== false}
          wellnessEnabled={enabledModules.wellness !== false}
          events={data.week.find((d) => d.isToday)?.events ?? []}
          dueToday={data.dueToday}
          overdue={data.overdue}
          dueThisWeek={data.dueThisWeek}
          appointments={data.appointments}
          undated={data.undated}
          undatedCount={data.undatedCount}
        />
        {shown.map((card, i) => {
          const entry = cards[card.key]!;
          return (
            <div key={card.key} className={cn(entry.span, customising && 'flex flex-col gap-1')}>
              {customising && (
                <CardControls card={card} first={i === 0} last={i === shown.length - 1} />
              )}
              {entry.node}
            </div>
          );
        })}
        {customising && (
          <AddCards hidden={normaliseLayout(layout).hidden} enabledModules={enabledModules} />
        )}
      </div>
    </div>
  );
}
