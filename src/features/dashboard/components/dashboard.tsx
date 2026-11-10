import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  ClockIcon,
  InboxIcon,
  ListChecksIcon,
  PlusIcon,
  QuoteIcon,
  TargetIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import { Inbox } from '@/features/capture/components/inbox';
import { QuickCapture } from '@/features/capture/components/quick-capture';
import { TaskRow } from '@/features/tasks/components/task-row';
import { ACCENT_BG } from '@/lib/accents';
import { ProgressBar } from '@/components/shared/progress-bar';
import { cn } from '@/lib/utils';
import type { DashboardData } from '../queries';
import { BibleDashboardCard } from '@/features/faith/components/bible-dashboard-card';
import { HabitsDashboardCard } from '@/features/habits/components/habits-dashboard-card';
import { JournalDashboardCard } from '@/features/journal/components/journal-dashboard-card';
import { MoodDashboardCard } from '@/features/wellness/components/mood-dashboard-card';
import { RoutinesDashboardCard } from '@/features/routines/components/routines-dashboard-card';
import { TimeDashboardCard } from '@/features/time/components/time-dashboard-card';
import { DashboardCard, EmptyNote } from './dashboard-card';

const HORIZON_LABEL = {
  lifelong: 'Lifelong',
  annual: 'Annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
  weekly: 'Weekly',
} as const;

const LATER_MODULES = [{ label: 'Job schedule', icon: BriefcaseIcon, release: 5 }];

export function Dashboard({
  data,
  timeZone,
  userId,
}: {
  data: DashboardData;
  timeZone: string;
  userId: string;
}) {
  const editHref = (id: string) => `/tasks?task=${id}`;
  const timeOf = (startsAt: Date | null) =>
    startsAt ? format(toZonedTime(startsAt, timeZone), 'HH:mm') : '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/tasks?new=1"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <PlusIcon data-icon="inline-start" />
          Task
        </Link>
        <Link
          href="/calendar?new=1"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <PlusIcon data-icon="inline-start" />
          Event
        </Link>
        <div className="ml-auto w-full sm:w-auto">
          <QuickCapture />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
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

        <div className="lg:col-span-5">
          <DashboardCard
            title="Arriving in later releases"
            icon={ChartPieIcon}
            href="/reviews"
            release={3}
          >
            <ul className="flex flex-col gap-1.5">
              {LATER_MODULES.map((m) => (
                <li key={m.label} className="flex items-center gap-2 text-sm">
                  <m.icon className="text-muted-foreground size-4" aria-hidden />
                  <span className="flex-1">{m.label}</span>
                  <Badge variant="outline">Release {m.release}</Badge>
                </li>
              ))}
            </ul>
            <EmptyNote>These cards fill in as their modules ship.</EmptyNote>
          </DashboardCard>
        </div>

        <div className="lg:col-span-4">
          <RoutinesDashboardCard userId={userId} todayKey={data.todayKey} />
        </div>
        <div className="lg:col-span-4">
          <HabitsDashboardCard userId={userId} todayKey={data.todayKey} />
        </div>
        <div className="lg:col-span-4">
          <TimeDashboardCard
            userId={userId}
            todayKey={data.todayKey}
            weekStartsOn={data.weekStartsOn}
            timeZone={timeZone}
          />
        </div>
        <div className="lg:col-span-6">
          <BibleDashboardCard userId={userId} todayKey={data.todayKey} />
        </div>
        <div className="lg:col-span-6">
          <JournalDashboardCard userId={userId} todayKey={data.todayKey} />
        </div>
        <div className="lg:col-span-4">
          <MoodDashboardCard userId={userId} todayKey={data.todayKey} />
        </div>

        <div className="lg:col-span-12">
          <DashboardCard
            title="Weekly schedule"
            icon={CalendarDaysIcon}
            href="/calendar"
            release={1}
          >
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
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          ACCENT_BG[t.segment.accent]
                        )}
                      />
                      <span className="truncate">{t.title}</span>
                    </p>
                  ))}
                </Link>
              ))}
            </div>
          </DashboardCard>
        </div>

        <div className="lg:col-span-6">
          <DashboardCard title="Today's priorities" icon={ListChecksIcon} href="/tasks" release={1}>
            {data.priorities.length === 0 && (
              <EmptyNote>Nothing due today. Pick something from this week.</EmptyNote>
            )}
            <ul className="flex flex-col">
              {data.priorities.map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} status={t.due} editHref={editHref(t.id)} />
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>

        <div className="lg:col-span-3">
          <DashboardCard title="Due this week" icon={CalendarDaysIcon} href="/tasks" release={1}>
            {data.dueThisWeek.length === 0 && <EmptyNote>Nothing else due this week.</EmptyNote>}
            <ul className="flex flex-col gap-2">
              {data.dueThisWeek.slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-sm">
                  <SegmentDot accent={t.segment.accent} className="mt-1.5" />
                  <Link href={editHref(t.id)} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate">{t.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {t.dueDate && format(parseISO(t.dueDate), 'EEEE')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>

        <div className="lg:col-span-3">
          <DashboardCard title="Overdue" icon={TriangleAlertIcon} href="/tasks" release={1}>
            {data.overdue.length === 0 && <EmptyNote>All caught up.</EmptyNote>}
            <ul className="flex flex-col">
              {data.overdue.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} status={t.due} editHref={editHref(t.id)} compact />
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>

        <div className="lg:col-span-4">
          <DashboardCard title="Active goals" icon={TargetIcon} href="/goals" release={1}>
            {data.goals.length === 0 && (
              <EmptyNote>No active goals yet. Start with a lifelong one.</EmptyNote>
            )}
            <ul className="flex flex-col gap-3">
              {data.goals.map((g) => (
                <li key={g.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <SegmentDot accent={g.segment.accent} />
                    <Link
                      href={`/goals/${g.id}`}
                      className="flex-1 truncate text-sm hover:underline"
                    >
                      {g.title}
                    </Link>
                    <Badge variant="outline">{HORIZON_LABEL[g.horizon]}</Badge>
                  </div>
                  <ProgressBar value={g.progress} />
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>

        <div className="lg:col-span-4">
          <DashboardCard
            title="Upcoming appointments"
            icon={ClockIcon}
            href="/calendar"
            release={1}
          >
            {data.appointments.length === 0 && (
              <EmptyNote>No appointments in the next seven days.</EmptyNote>
            )}
            <ul className="flex flex-col gap-2">
              {data.appointments.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-14 shrink-0 text-xs">
                    {format(
                      parseISO(
                        e.isAllDay
                          ? (e.allDayDate ?? data.todayKey)
                          : format(toZonedTime(e.startsAt ?? new Date(), timeZone), 'yyyy-MM-dd')
                      ),
                      'EEE d'
                    )}
                  </span>
                  <span className="flex-1 truncate">{e.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {e.isAllDay ? 'All day' : timeOf(e.startsAt)}
                  </span>
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>

        <div className="lg:col-span-4">
          <DashboardCard title="Inbox" icon={InboxIcon} href="/tasks" release={1}>
            <Inbox captures={data.captures} segments={data.segments} />
          </DashboardCard>
        </div>

        <div className="lg:col-span-4">
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
                <figcaption className="text-muted-foreground text-xs">
                  {data.quote.author}
                </figcaption>
              </figure>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
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
        </div>
      </div>
    </div>
  );
}
