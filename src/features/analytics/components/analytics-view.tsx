import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  ActivityIcon,
  ClockIcon,
  FolderKanbanIcon,
  ScaleIcon,
  SmileIcon,
  TargetIcon,
  type LucideIcon,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { SegmentDot } from '@/components/shared/segment-badge';
import { HORIZON_LABELS } from '@/features/goals/schema';
import { FREQUENCY_LABELS, PERIOD_NOUN } from '@/features/habits/schema';
import { cn } from '@/lib/utils';
import {
  formatChange,
  formatHours,
  formatHoursDelta,
  formatPercent,
  shareOf,
  SUMMARY_LABELS,
  SUMMARY_MEASURES,
  type GoalCompletion,
  type HabitConsistency,
  type HabitRow,
  type LifeBalance,
  type MoodTrend,
  type ProjectsAndMilestones,
  type Summary,
  type TimeAllocation,
} from '../compute';
import type { ResolvedPeriod } from '../period';
import type { AnalyticsData } from '../queries';

const dayLabel = (key: string) => format(parseISO(key), 'd MMM');

// ───────────────────────── building blocks ─────────────────────────

function Section({
  id,
  title,
  description,
  className,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className} data-testid={`analytics-${id}`}>
      <CardHeader>
        <h2 className="font-heading text-lg">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

function SectionEmpty({
  icon,
  title,
  description,
  href,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        <Link href={href} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          {cta}
        </Link>
      }
    />
  );
}

type Figure = { label: string; value: string; hint?: string; tone?: 'default' | 'destructive' };

/** A short row of headline numbers inside a section. */
function Figures({ items, className }: { items: Figure[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-3 gap-3', className)}>
      {items.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-muted-foreground text-xs">{f.label}</dt>
          <dd
            className={cn(
              'text-xl font-semibold',
              f.tone === 'destructive' && f.value !== '0' && 'text-destructive'
            )}
          >
            {f.value}
          </dd>
          {f.hint && <dd className="text-muted-foreground text-xs">{f.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

type Tone = 'full' | 'soft';

/** One thin bar in a track. Decorative: the number sits in text beside it. */
function Bar({
  value,
  max,
  tone = 'full',
  className,
}: {
  value: number;
  max: number;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn('bg-muted h-1.5 w-full overflow-hidden rounded-full', className)}
      aria-hidden
    >
      <div
        className={cn('h-full rounded-r-full', tone === 'soft' ? 'bg-primary/40' : 'bg-primary')}
        style={{ width: `${shareOf(value, max)}%` }}
      />
    </div>
  );
}

function Legend({ items }: { items: Array<{ tone: Tone; label: string }> }) {
  return (
    <ul
      className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs"
      aria-label="Legend"
    >
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              'inline-block size-2.5 rounded-sm',
              i.tone === 'soft' ? 'bg-primary/40' : 'bg-primary'
            )}
            aria-hidden
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function Subheading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium">{children}</h3>;
}

// ───────────────────────── 1. goal completion ─────────────────────────

function GoalSection({ goals, period }: { goals: GoalCompletion; period: ResolvedPeriod }) {
  const span = 'lg:col-span-6';
  if (goals.isEmpty) {
    return (
      <Section id="goals" title="Goal completion" className={span}>
        <SectionEmpty
          icon={TargetIcon}
          title={`No goals due in ${period.label}`}
          description="Goals with a target date in the period are counted here by horizon, with the ones you achieved."
          href="/goals"
          cta="Go to goals"
        />
      </Section>
    );
  }
  return (
    <Section
      id="goals"
      title="Goal completion"
      description="Goals with a target date in the period, by horizon."
      className={span}
    >
      {goals.total === 0 ? (
        <p className="text-muted-foreground text-sm">
          No goal has a target date in {period.label}.
        </p>
      ) : (
        <Figures
          items={[
            { label: 'Due', value: String(goals.total) },
            {
              label: 'Achieved',
              value: formatPercent(goals.rate),
              hint: `${goals.achieved} of ${goals.total}`,
            },
            { label: 'Average progress', value: `${goals.averageProgress}%` },
          ]}
        />
      )}
      {goals.byHorizon.length > 0 && (
        <Table>
          <caption className="sr-only">Goals due in {period.label} by horizon</caption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Horizon</TableHead>
              <TableHead className="text-right">Achieved</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals.byHorizon.map((r) => (
              <TableRow key={r.horizon}>
                <TableCell className="whitespace-normal">
                  <span>{HORIZON_LABELS[r.horizon]}</span>
                  <p className="text-muted-foreground mt-0.5 text-xs tabular-nums sm:hidden">
                    {r.averageProgress}% average progress
                  </p>
                  <div className="mt-1.5">
                    <Bar value={r.averageProgress} max={100} />
                  </div>
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {r.achieved}/{r.total}
                </TableCell>
                <TableCell className="hidden text-right align-top tabular-nums sm:table-cell">
                  {r.averageProgress}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="flex flex-col gap-1">
        <Subheading>Achieved in {period.label}</Subheading>
        {goals.achievedInPeriod.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No goal was marked achieved in this period.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {goals.achievedInPeriod.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/goals/${g.id}`}
                  className="truncate underline-offset-4 hover:underline"
                >
                  {g.title}
                </Link>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {HORIZON_LABELS[g.horizon]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

// ───────────────────────── 2. habit consistency ─────────────────────────

function streakText(h: HabitRow): string {
  if (h.currentStreak === 0) return 'No streak';
  const noun = PERIOD_NOUN[h.frequency];
  return `${h.currentStreak} ${noun}${h.currentStreak === 1 ? '' : 's'}`;
}

function HabitSection({ habits, period }: { habits: HabitConsistency; period: ResolvedPeriod }) {
  const span = 'lg:col-span-6';
  if (habits.isEmpty) {
    return (
      <Section id="habits" title="Habit consistency" className={span}>
        <SectionEmpty
          icon={ActivityIcon}
          title="No habits to measure"
          description="Add a habit and check it in; its consistency against the target appears here."
          href="/habits"
          cta="Go to habits"
        />
      </Section>
    );
  }
  const onStreak = habits.rows.filter((r) => r.currentStreak > 0).length;
  return (
    <Section
      id="habits"
      title="Habit consistency"
      description="Check-ins against each habit's target over the period so far."
      className={span}
    >
      <Figures
        items={[
          {
            label: 'Overall consistency',
            value: formatPercent(habits.rate),
            hint: `${habits.achieved} of ${habits.expected} expected`,
          },
          { label: 'Habits', value: String(habits.rows.length) },
          { label: 'On a streak', value: String(onStreak) },
        ]}
      />
      <Table>
        <caption className="sr-only">Habit consistency in {period.label}</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">Habit</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Check-ins</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Streak</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {habits.rows.map((h) => (
            <TableRow key={h.id}>
              <TableCell className="whitespace-normal">
                <div className="flex items-center gap-1.5">
                  <SegmentDot accent={h.accent} />
                  <span className="min-w-0 flex-1 truncate">{h.name}</span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                  {FREQUENCY_LABELS[h.frequency]}
                  {h.target > 1 && ` · ${h.target}× per ${PERIOD_NOUN[h.frequency]}`}
                  <span className="sm:hidden">
                    {' '}
                    · {h.count} of {h.expected} · {streakText(h)}
                  </span>
                </p>
                <div className="mt-1.5">
                  <Bar value={h.rate ?? 0} max={100} />
                </div>
              </TableCell>
              <TableCell className="hidden text-right align-top tabular-nums sm:table-cell">
                {h.count} of {h.expected}
              </TableCell>
              <TableCell className="text-right align-top tabular-nums">
                {formatPercent(h.rate)}
              </TableCell>
              <TableCell className="text-muted-foreground hidden text-right align-top tabular-nums sm:table-cell">
                {streakText(h)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}

// ───────────────────────── 3. time allocation ─────────────────────────

function TimeSection({ time, period }: { time: TimeAllocation; period: ResolvedPeriod }) {
  const span = 'lg:col-span-6';
  if (time.isEmpty) {
    return (
      <Section id="time" title="Time allocation" className={span}>
        <SectionEmpty
          icon={ClockIcon}
          title="Nothing planned or logged"
          description={`No time blocks or time entries in ${period.label}. Plan a block or start the timer and the comparison appears here.`}
          href="/time"
          cta="Go to time blocking"
        />
      </Section>
    );
  }
  const max = Math.max(1, ...time.rows.map((r) => Math.max(r.planned, r.actual)));
  return (
    <Section
      id="time"
      title="Time allocation"
      description="Planned blocks against logged time, per Life Segment."
      className={span}
    >
      <Figures
        items={[
          { label: 'Planned', value: formatHours(time.plannedTotal) },
          { label: 'Logged', value: formatHours(time.actualTotal) },
          {
            label: 'Difference',
            value: formatHoursDelta(time.delta),
            hint:
              time.delta > 0
                ? 'more than planned'
                : time.delta < 0
                  ? 'less than planned'
                  : 'logged equals planned',
          },
        ]}
      />
      <Legend
        items={[
          { tone: 'soft', label: 'Planned' },
          { tone: 'full', label: 'Logged' },
        ]}
      />
      <Table>
        <caption className="sr-only">Planned and logged hours per Life Segment</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">Segment</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Planned</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Logged</TableHead>
            <TableHead className="text-right">Difference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {time.rows.map((r) => (
            <TableRow key={r.segmentId}>
              <TableCell className="whitespace-normal">
                <div className="flex items-center gap-1.5">
                  <SegmentDot accent={r.accent} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs tabular-nums sm:hidden">
                  {formatHours(r.actual)} logged of {formatHours(r.planned)} planned
                </p>
                <div className="mt-1.5 flex flex-col gap-0.5">
                  <Bar value={r.planned} max={max} tone="soft" />
                  <Bar value={r.actual} max={max} />
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground hidden text-right align-top tabular-nums sm:table-cell">
                {formatHours(r.planned)}
              </TableCell>
              <TableCell className="hidden text-right align-top tabular-nums sm:table-cell">
                {formatHours(r.actual)}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right align-top tabular-nums',
                  r.delta === 0 && 'text-muted-foreground'
                )}
              >
                {formatHoursDelta(r.delta)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Link
        href={
          period.period === 'month'
            ? `/time/analytics?range=month&start=${period.start}`
            : '/time/analytics'
        }
        className="text-primary self-start text-sm underline-offset-4 hover:underline"
      >
        Time analytics by day, project and task
      </Link>
    </Section>
  );
}

// ───────────────────────── 4. projects and milestones ─────────────────────────

const PROJECT_LIMIT = 8;

function ProjectSection({
  projects,
  period,
}: {
  projects: ProjectsAndMilestones;
  period: ResolvedPeriod;
}) {
  const span = 'lg:col-span-6';
  if (projects.isEmpty) {
    return (
      <Section id="projects" title="Projects and milestones" className={span}>
        <SectionEmpty
          icon={FolderKanbanIcon}
          title="No active projects or milestones"
          description={`Nothing is in progress and no milestone is due in ${period.label}.`}
          href="/projects"
          cta="Go to projects"
        />
      </Section>
    );
  }
  const shown = projects.projects.slice(0, PROJECT_LIMIT);
  return (
    <Section
      id="projects"
      title="Projects and milestones"
      description="Milestones due in the period, and how far each active project has come."
      className={span}
    >
      {projects.milestonesTotal === 0 ? (
        <p className="text-muted-foreground text-sm">No milestone is due in {period.label}.</p>
      ) : (
        <Figures
          items={[
            { label: 'Milestones due', value: String(projects.milestonesTotal) },
            {
              label: 'Done',
              value: formatPercent(projects.milestoneRate),
              hint: `${projects.milestonesDone} of ${projects.milestonesTotal}`,
            },
            { label: 'Overdue', value: String(projects.overdue.length), tone: 'destructive' },
          ]}
        />
      )}
      {projects.overdue.length > 0 && (
        <div className="flex flex-col gap-1">
          <Subheading>Overdue milestones</Subheading>
          <ul className="flex flex-col gap-1 text-sm">
            {projects.overdue.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {m.href ? (
                    <Link href={m.href} className="underline-offset-4 hover:underline">
                      {m.title}
                    </Link>
                  ) : (
                    m.title
                  )}
                  {m.parentTitle && (
                    <span className="text-muted-foreground"> · {m.parentTitle}</span>
                  )}
                </span>
                <span className="text-destructive shrink-0 text-xs">
                  {m.dueDate ? `Due ${dayLabel(m.dueDate)}` : 'No date'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Subheading>Active projects</Subheading>
        {shown.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No project is in progress.{' '}
            <Link href="/projects" className="text-primary underline-offset-4 hover:underline">
              Go to projects
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((p) => (
              <li key={p.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <SegmentDot accent={p.accent} />
                  <Link
                    href={`/projects/${p.id}`}
                    className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                  >
                    {p.title}
                  </Link>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {p.progress}%
                  </span>
                </div>
                <Bar value={p.progress} max={100} />
              </li>
            ))}
          </ul>
        )}
        {projects.projects.length > PROJECT_LIMIT && (
          <Link
            href="/projects"
            className="text-primary self-start text-sm underline-offset-4 hover:underline"
          >
            All {projects.projects.length} active projects
          </Link>
        )}
      </div>
    </Section>
  );
}

// ───────────────────────── 5. mood and energy ─────────────────────────

const SCALE_MAX = 5;

function MoodChart({ mood, period }: { mood: MoodTrend; period: ResolvedPeriod }) {
  const cols = mood.buckets;
  const unit = period.period === 'month' ? 'day' : 'week';
  // Label a handful of columns; the rest are in the table below.
  const every = Math.max(1, Math.ceil(cols.length / 6));
  const labelled = cols
    .map((c, i) => ({ ...c, i }))
    .filter((c) => c.i % every === 0 || c.i === cols.length - 1);
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">
        Average mood and energy per {unit}, {period.label}
      </figcaption>
      <div className="flex h-36 items-end gap-0.5 border-b sm:gap-1" aria-hidden>
        {cols.map((c) => {
          const moodHeight = shareOf(c.mood ?? 0, SCALE_MAX);
          const energyHeight = shareOf(c.energy ?? 0, SCALE_MAX);
          return (
            <div
              key={c.key}
              className="relative flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
              title={
                c.mood === null
                  ? `${c.label}: no entry`
                  : `${c.label}: mood ${c.mood}, energy ${c.energy}`
              }
            >
              {mood.peakKey === c.key && c.mood !== null && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 text-[10px] leading-none tabular-nums"
                  style={{ bottom: `calc(${moodHeight}% + 3px)` }}
                >
                  {c.mood}
                </span>
              )}
              <div
                className="bg-primary w-1/2 max-w-3 rounded-t-[4px]"
                style={{ height: `${moodHeight}%` }}
              />
              <div
                className="bg-primary/40 w-1/2 max-w-3 rounded-t-[4px]"
                style={{ height: `${energyHeight}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="relative h-4" aria-hidden>
        {labelled.map((c) => {
          const first = c.i === 0;
          const last = c.i === cols.length - 1;
          return (
            <span
              key={c.key}
              className={cn(
                'text-muted-foreground absolute top-0 text-[10px] whitespace-nowrap',
                !first && !last && '-translate-x-1/2'
              )}
              style={
                first
                  ? { left: 0 }
                  : last
                    ? { right: 0 }
                    : { left: `${((c.i + 0.5) / cols.length) * 100}%` }
              }
            >
              {c.label}
            </span>
          );
        })}
      </div>
      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer text-xs">
          Mood and energy by {unit} as a table
        </summary>
        <Table>
          <caption className="sr-only">Average mood and energy per {unit}</caption>
          <TableHeader>
            <TableRow>
              <TableHead className="capitalize">{unit}</TableHead>
              <TableHead className="text-right">Mood</TableHead>
              <TableHead className="text-right">Energy</TableHead>
              <TableHead className="text-right">Entries</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cols.map((c) => (
              <TableRow key={c.key}>
                <TableCell>
                  {unit === 'day' ? dayLabel(c.key) : `${c.label} – ${dayLabel(c.end)}`}
                </TableCell>
                <TableCell className="text-right tabular-nums">{c.mood ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{c.energy ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {c.entries}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </figure>
  );
}

function MoodSection({ mood, period }: { mood: MoodTrend; period: ResolvedPeriod }) {
  const span = 'lg:col-span-12';
  if (mood.isEmpty) {
    return (
      <Section id="mood" title="Mood and energy trends" className={span}>
        <SectionEmpty
          icon={SmileIcon}
          title="No mood entries"
          description={`Nothing was logged in ${period.label}. Rate your mood and energy once a day and the trend appears here.`}
          href="/wellness/mood"
          cta="Log mood and energy"
        />
      </Section>
    );
  }
  const unit = period.period === 'month' ? 'day' : 'week';
  return (
    <Section
      id="mood"
      title="Mood and energy trends"
      description={`Average mood and energy per ${unit}, on a 1 to 5 scale.`}
      className={span}
    >
      <Figures
        items={[
          { label: 'Average mood', value: String(mood.averageMood), hint: 'out of 5' },
          { label: 'Average energy', value: String(mood.averageEnergy), hint: 'out of 5' },
          {
            label: 'Entries',
            value: String(mood.entries),
            hint: `of ${period.days} days`,
          },
        ]}
      />
      <Legend
        items={[
          { tone: 'full', label: 'Mood' },
          { tone: 'soft', label: 'Energy' },
        ]}
      />
      <MoodChart mood={mood} period={period} />
    </Section>
  );
}

// ───────────────────────── 6. summary ─────────────────────────

function SummarySection({ summary, period }: { summary: Summary; period: ResolvedPeriod }) {
  return (
    <Section
      id="summary"
      title="Summary"
      description={`What got done in ${period.label}, against ${period.previous.label}.`}
      className="lg:col-span-12"
    >
      <Figures
        className="grid-cols-2 sm:grid-cols-4"
        items={SUMMARY_MEASURES.map((m) => ({
          label: SUMMARY_LABELS[m],
          value: String(summary.current[m]),
          hint: `${summary.previous[m]} in ${period.previous.label} · ${formatChange(summary.change[m])}`,
        }))}
      />
    </Section>
  );
}

// ───────────────────────── 7. life balance ─────────────────────────

function ShareCell({ value, max }: { value: number | null; max: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Bar value={value ?? 0} max={max} className="w-16" />
      <span className="w-9 text-right tabular-nums">{formatPercent(value)}</span>
    </div>
  );
}

function BalanceSection({ balance }: { balance: LifeBalance }) {
  const span = 'lg:col-span-12';
  if (balance.isEmpty) {
    return (
      <Section id="balance" title="Life balance" className={span}>
        <SectionEmpty
          icon={ScaleIcon}
          title="Nothing to weigh yet"
          description="Open tasks, logged time and goals per Life Segment appear here next to the weight you gave each segment."
          href="/segments"
          cta="Go to segments"
        />
      </Section>
    );
  }
  const max = Math.max(
    1,
    ...balance.rows.flatMap((r) => [
      r.weightShare,
      r.taskShare ?? 0,
      r.timeShare ?? 0,
      r.goalShare ?? 0,
    ])
  );
  return (
    <Section
      id="balance"
      title="Life balance"
      description="How open tasks, logged time and goals spread across your Life Segments, next to each segment's share of the weights."
      className={span}
    >
      <Legend
        items={[
          { tone: 'soft', label: 'Weight share' },
          { tone: 'full', label: 'Share of tasks, time or goals' },
        ]}
      />
      <Table>
        <caption className="sr-only">Life balance by segment</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">Segment</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="hidden text-right md:table-cell">Tasks</TableHead>
            <TableHead className="hidden text-right md:table-cell">Time</TableHead>
            <TableHead className="hidden text-right md:table-cell">Goals</TableHead>
            <TableHead className="text-right">Attention</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {balance.rows.map((r) => (
            <TableRow key={r.segmentId}>
              <TableCell className="whitespace-normal">
                <div className="flex items-center gap-1.5">
                  <SegmentDot accent={r.accent} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs tabular-nums md:hidden">
                  Tasks {formatPercent(r.taskShare)} · Time {formatPercent(r.timeShare)} · Goals{' '}
                  {formatPercent(r.goalShare)}
                </p>
                <div className="mt-1.5 flex flex-col gap-0.5 md:hidden">
                  <Bar value={r.weightShare} max={max} tone="soft" />
                  <Bar value={r.attentionShare ?? 0} max={max} />
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground align-top">
                <div className="flex items-center justify-end gap-2">
                  <Bar
                    value={r.weightShare}
                    max={max}
                    tone="soft"
                    className="hidden w-16 md:block"
                  />
                  <span className="w-9 text-right tabular-nums">{r.weightShare}%</span>
                </div>
              </TableCell>
              <TableCell className="hidden align-top md:table-cell">
                <ShareCell value={r.taskShare} max={max} />
              </TableCell>
              <TableCell className="hidden align-top md:table-cell">
                <ShareCell value={r.timeShare} max={max} />
              </TableCell>
              <TableCell className="hidden align-top md:table-cell">
                <ShareCell value={r.goalShare} max={max} />
              </TableCell>
              <TableCell className="text-right align-top tabular-nums">
                {formatPercent(r.attentionShare)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {balance.note && <p className="text-sm">{balance.note}</p>}
    </Section>
  );
}

// ───────────────────────── the page body ─────────────────────────

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const { period } = data;
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <GoalSection goals={data.goals} period={period} />
      <HabitSection habits={data.habits} period={period} />
      <TimeSection time={data.time} period={period} />
      <ProjectSection projects={data.projects} period={period} />
      <MoodSection mood={data.mood} period={period} />
      <SummarySection summary={data.summary} period={period} />
      <BalanceSection balance={data.balance} />
    </div>
  );
}
