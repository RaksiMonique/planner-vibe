import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ChartColumnIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
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
import { StatTiles } from '@/components/shared/stat-tile';
import type { Accent } from '@/lib/accents';
import { cn } from '@/lib/utils';
import {
  analyticsHref,
  formatDelta,
  NO_PROJECT,
  shareOf,
  type ComparisonRow,
  type DayRow,
  type MinutesRow,
  type ResolvedRange,
} from '../analytics';
import { ACTIVITY_ACCENT, ACTIVITY_LABELS, formatMinutes, type ActivityType } from '../schema';
import type { TimeAnalyticsData } from '../service';

export type AnalyticsLabels = {
  segments: Record<string, { name: string; accent: Accent }>;
};

const dayLabel = (key: string, pattern: string) => format(parseISO(key), pattern);

// ───────────────────────── range navigation ─────────────────────────

export function AnalyticsRangeNav({ range }: { range: ResolvedRange }) {
  const isWeek = range.range === 'week';
  return (
    <nav aria-label="Range" className="flex flex-wrap items-center gap-2">
      <div className="bg-card flex rounded-lg border p-0.5" role="group" aria-label="Range length">
        {(['week', 'month'] as const).map((r) => (
          <Link
            key={r}
            href={analyticsHref(r, range.startKey)}
            aria-current={range.range === r ? 'page' : undefined}
            className={buttonVariants({
              variant: range.range === r ? 'secondary' : 'ghost',
              size: 'sm',
            })}
          >
            {r === 'week' ? 'Week' : 'Month'}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Link
          href={analyticsHref(range.range, range.prevStartKey)}
          className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
          aria-label={isWeek ? 'Previous week' : 'Previous month'}
        >
          <ChevronLeftIcon />
        </Link>
        <Link
          href={analyticsHref(range.range)}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {isWeek ? 'This week' : 'This month'}
        </Link>
        <Link
          href={analyticsHref(range.range, range.nextStartKey)}
          className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
          aria-label={isWeek ? 'Next week' : 'Next month'}
        >
          <ChevronRightIcon />
        </Link>
      </div>
      <p className="font-heading w-full text-lg sm:ml-auto sm:w-auto">{range.label}</p>
    </nav>
  );
}

// ───────────────────────── marks ─────────────────────────

/** One thin bar in a track. Decorative: the numbers sit in text beside it. */
function Bar({ value, max, tone }: { value: number; max: number; tone: 'planned' | 'actual' }) {
  return (
    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full" aria-hidden>
      <div
        className={cn('h-full rounded-r-full', tone === 'planned' ? 'bg-primary/40' : 'bg-primary')}
        style={{ width: `${shareOf(value, max)}%` }}
      />
    </div>
  );
}

function Legend() {
  return (
    <ul
      className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs"
      aria-label="Legend"
    >
      <li className="flex items-center gap-1.5">
        <span className="bg-primary/40 inline-block size-2.5 rounded-sm" aria-hidden />
        Planned
      </li>
      <li className="flex items-center gap-1.5">
        <span className="bg-primary inline-block size-2.5 rounded-sm" aria-hidden />
        Logged
      </li>
    </ul>
  );
}

// ───────────────────────── tables ─────────────────────────

function ComparisonTable({
  caption,
  rows,
  label,
  accentOf,
}: {
  caption: string;
  rows: ComparisonRow[];
  label: (key: string) => string;
  accentOf?: (key: string) => Accent | undefined;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.planned, r.actual)));
  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-full">Name</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Planned</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Logged</TableHead>
          <TableHead className="text-right">Difference</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const accent = accentOf?.(r.key);
          return (
            <TableRow key={r.key}>
              <TableCell className="whitespace-normal">
                <div className="flex items-center gap-1.5">
                  {accent && <SegmentDot accent={accent} />}
                  <span className="min-w-0 flex-1 truncate">{label(r.key)}</span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs tabular-nums sm:hidden">
                  {formatMinutes(r.actual)} logged of {formatMinutes(r.planned)} planned
                </p>
                <div className="mt-1.5 flex flex-col gap-0.5">
                  <Bar value={r.planned} max={max} tone="planned" />
                  <Bar value={r.actual} max={max} tone="actual" />
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground hidden text-right align-top tabular-nums sm:table-cell">
                {formatMinutes(r.planned)}
              </TableCell>
              <TableCell className="hidden text-right align-top tabular-nums sm:table-cell">
                {formatMinutes(r.actual)}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right align-top tabular-nums',
                  r.delta === 0 && 'text-muted-foreground'
                )}
              >
                {formatDelta(r.delta)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function MinutesTable({
  caption,
  rows,
  valueHead,
  label,
  accentOf,
}: {
  caption: string;
  rows: MinutesRow[];
  valueHead: string;
  label: (key: string) => string;
  accentOf?: (key: string) => Accent | undefined;
}) {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-full">Name</TableHead>
          <TableHead className="text-right">{valueHead}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const accent = accentOf?.(r.key);
          return (
            <TableRow key={r.key}>
              <TableCell className="whitespace-normal">
                <div className="flex items-center gap-1.5">
                  {accent && <SegmentDot accent={accent} />}
                  <span className="min-w-0 flex-1 truncate">{label(r.key)}</span>
                </div>
                <div className="mt-1.5">
                  <Bar value={r.minutes} max={max} tone="actual" />
                </div>
              </TableCell>
              <TableCell className="text-right align-top tabular-nums">
                {formatMinutes(r.minutes)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ───────────────────────── by day ─────────────────────────

function DayChart({ days, range }: { days: DayRow[]; range: ResolvedRange }) {
  const max = Math.max(1, ...days.map((d) => d.actual));
  const busiest = days.reduce<DayRow | null>(
    (best, d) => (d.actual > 0 && (!best || d.actual > best.actual) ? d : best),
    null
  );
  const isWeek = range.range === 'week';
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">Logged minutes per day, {range.label}</figcaption>
      {!busiest && (
        <p className="text-muted-foreground text-sm">
          Nothing logged in this range yet; the planned blocks are counted above.
        </p>
      )}
      <div className="flex h-36 items-end gap-0.5 border-b sm:gap-1" aria-hidden>
        {days.map((d) => (
          <div
            key={d.key}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            title={`${dayLabel(d.key, 'EEE d MMM')}: ${formatMinutes(d.actual)} logged, ${formatMinutes(d.planned)} planned`}
          >
            {busiest?.key === d.key && (
              <span className="text-[10px] leading-none tabular-nums">
                {formatMinutes(d.actual)}
              </span>
            )}
            <div
              className="bg-primary w-full max-w-6 rounded-t-[4px]"
              style={{ height: `${shareOf(d.actual, max)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-0.5 sm:gap-1" aria-hidden>
        {days.map((d, i) => (
          <span key={d.key} className="text-muted-foreground flex-1 text-center text-[10px]">
            {isWeek
              ? dayLabel(d.key, 'EEEEE')
              : i % 7 === 0 || i === days.length - 1
                ? dayLabel(d.key, 'd')
                : ''}
          </span>
        ))}
      </div>
      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer text-xs">
          Minutes by day as a table
        </summary>
        <Table>
          <caption className="sr-only">Planned and logged minutes per day</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead className="text-right">Planned</TableHead>
              <TableHead className="text-right">Logged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((d) => (
              <TableRow key={d.key}>
                <TableCell>{dayLabel(d.key, 'EEE d MMM')}</TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {formatMinutes(d.planned)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMinutes(d.actual)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </figure>
  );
}

// ───────────────────────── the view ─────────────────────────

function Panel({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <h2 className="font-heading text-lg">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

export function AnalyticsView({
  range,
  data,
  labels,
}: {
  range: ResolvedRange;
  data: TimeAnalyticsData;
  labels: AnalyticsLabels;
}) {
  const a = data.analytics;
  if (a.isEmpty) {
    return (
      <EmptyState
        icon={ChartColumnIcon}
        title="Nothing planned or logged"
        description={`No time blocks or time entries for ${range.label}. Plan a block or start the timer and the comparison appears here.`}
        action={
          <Link href="/time" className={buttonVariants()}>
            Go to time blocking
          </Link>
        }
      />
    );
  }
  const segmentName = (key: string) => labels.segments[key]?.name ?? 'Unknown segment';
  const projectName = (key: string) =>
    key === NO_PROJECT ? 'No project' : (data.projectTitles[key] ?? 'Unknown project');
  const taskName = (key: string) => data.taskTitles[key] ?? 'Unknown task';
  const activityName = (key: string) => ACTIVITY_LABELS[key as ActivityType] ?? key;

  return (
    <div className="flex flex-col gap-6">
      <StatTiles
        stats={[
          { label: 'Planned', value: formatMinutes(a.plannedTotal), hint: 'in time blocks' },
          {
            label: 'Logged',
            value: formatMinutes(a.actualTotal),
            hint: `on ${a.daysLogged} day${a.daysLogged === 1 ? '' : 's'}`,
          },
          {
            label: 'Difference',
            value: formatDelta(a.delta),
            hint:
              a.delta > 0
                ? 'more than planned'
                : a.delta < 0
                  ? 'less than planned'
                  : 'logged equals planned',
          },
          {
            label: 'Busiest day',
            value: a.busiestDay ? dayLabel(a.busiestDay.key, 'EEE d MMM') : '—',
            hint: a.busiestDay
              ? `${formatMinutes(a.busiestDay.actual)} logged`
              : 'nothing logged yet',
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel
          title="Logged time by day"
          description="Each column is the time logged on that day."
          className="lg:col-span-7"
        >
          <DayChart days={a.byDay} range={range} />
        </Panel>

        <Panel
          title="Planned by activity type"
          description="How the planned blocks split between deep work, light work and breaks."
          className="lg:col-span-5"
        >
          {a.byActivity.length === 0 ? (
            <p className="text-muted-foreground text-sm">No blocks planned in this range.</p>
          ) : (
            <MinutesTable
              caption="Planned minutes per activity type"
              rows={a.byActivity}
              valueHead="Planned"
              label={activityName}
              accentOf={(k) => ACTIVITY_ACCENT[k as ActivityType]}
            />
          )}
        </Panel>

        <Panel
          title="By Life Segment"
          description="Planned against logged, with the difference per segment."
          className="lg:col-span-6"
        >
          <Legend />
          <ComparisonTable
            caption="Planned and logged minutes per Life Segment"
            rows={a.bySegment}
            label={segmentName}
            accentOf={(k) => labels.segments[k]?.accent}
          />
        </Panel>

        <Panel
          title="By project"
          description="Time without a project is grouped under “No project”."
          className="lg:col-span-6"
        >
          <Legend />
          <ComparisonTable
            caption="Planned and logged minutes per project"
            rows={a.byProject}
            label={projectName}
          />
        </Panel>

        <Panel
          title="Top tasks by logged time"
          description="The tasks that received the most logged time in this range."
          className="lg:col-span-12"
        >
          {a.topTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No logged time is linked to a task yet. Pick a task when you log time or start the
              timer.
            </p>
          ) : (
            <MinutesTable
              caption="Logged minutes per task"
              rows={a.topTasks}
              valueHead="Logged"
              label={taskName}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
