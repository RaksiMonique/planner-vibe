import Link from 'next/link';
import { formatInTimeZone } from 'date-fns-tz';
import { ClockIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { listSegments } from '@/features/life-segments/service';
import { ACCENT_BG } from '@/lib/accents';
import type { WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { plannedVsActualPercent } from '../analysis';
import { ACTIVITY_LABELS, formatMinutes } from '../schema';
import { buildTimeRange, getRunningEntry, rangeFor } from '../service';

/** Dashboard slot: what is next today, the running timer, and the week's planned versus actual. */
export async function TimeDashboardCard({
  userId,
  todayKey,
  weekStartsOn,
  timeZone,
}: {
  userId: string;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
  timeZone: string;
}) {
  const week = rangeFor('week', todayKey, timeZone, weekStartsOn);
  const day = rangeFor('day', todayKey, timeZone, weekStartsOn);
  const [range, running, segments] = await Promise.all([
    buildTimeRange(userId, week.from, week.to, timeZone),
    getRunningEntry(userId),
    listSegments(userId),
  ]);
  const now = new Date();
  const todayBlocks = range.blocks.filter(
    (b) => new Date(b.end) > day.from && new Date(b.start) < day.to
  );
  const upcoming = todayBlocks.filter((b) => new Date(b.end) > now).slice(0, 3);
  const runningSegment = running ? segments.find((s) => s.id === running.lifeSegmentId) : null;
  const elapsed = running ? Math.round((now.getTime() - running.startedAt.getTime()) / 60000) : 0;
  const { plannedTotal, actualTotal } = range.analysis;

  return (
    <DashboardCard title="Time this week" icon={ClockIcon} href="/time" release={2}>
      {running && (
        <Link
          href="/time"
          className="bg-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
        >
          <span className="bg-terracotta size-2 animate-pulse rounded-full" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            Timer running{running.note ? `: ${running.note}` : ''}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatMinutes(elapsed)}
          </span>
          {runningSegment && <SegmentDot accent={runningSegment.accent} />}
        </Link>
      )}

      {upcoming.length === 0 ? (
        <EmptyNote>
          {todayBlocks.length === 0 ? 'Nothing blocked for today.' : "Today's blocks are done."}
        </EmptyNote>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {upcoming.map((b) => (
            <li key={b.id} className="flex items-center gap-2 text-sm">
              <span
                className={cn('size-2 shrink-0 rounded-full', ACCENT_BG[b.accent])}
                aria-hidden
              />
              <span className="text-muted-foreground w-11 shrink-0 text-xs tabular-nums">
                {formatInTimeZone(new Date(b.start), timeZone, 'HH:mm')}
              </span>
              <span className="min-w-0 flex-1 truncate">{b.title}</span>
              <span className="text-muted-foreground hidden text-xs sm:inline">
                {ACTIVITY_LABELS[b.activityType]}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <ProgressBar
          value={plannedTotal > 0 ? 100 : 0}
          label="Planned"
          valueText={formatMinutes(plannedTotal)}
        />
        <ProgressBar
          value={plannedVsActualPercent(plannedTotal, actualTotal)}
          label="Logged"
          valueText={formatMinutes(actualTotal)}
        />
      </div>
    </DashboardCard>
  );
}
