import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { CalendarRangeIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { GoalProgress } from '@/features/goals/components/goal-progress';
import type { WeekStartsOn } from '@/lib/dates';
import { elapsedPercent } from '../periods';
import { getQuarterData } from '../queries';

const GOALS = 4;
const MILESTONES = 3;
const CLOSED = new Set(['achieved', 'abandoned']);

/** How far the quarter has run, its quarterly goals and the next milestones due. */
export async function QuarterFocusDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const data = await getQuarterData(userId);
  const { range } = data;
  const elapsed = elapsedPercent(range.start, range.end, todayKey);
  const goals = [...data.objectives, ...data.undated].filter((g) => !CLOSED.has(g.status));
  const shownGoals = goals.slice(0, GOALS);
  const moreGoals = goals.length - shownGoals.length;
  const milestones = data.milestones
    .filter((m) => m.completedAt === null && m.dueDate !== null && m.dueDate >= todayKey)
    .slice(0, MILESTONES);

  return (
    <DashboardCard title="Quarter focus" icon={CalendarRangeIcon} href="/quarter" release={6}>
      <ProgressBar
        value={elapsed}
        label={range.label}
        valueText={`${elapsed}% through`}
        className="gap-0.5"
        valueClassName="text-muted-foreground"
      />

      {shownGoals.length === 0 ? (
        <EmptyNote>
          No quarterly goals yet.{' '}
          <Link href="/goals" className="text-primary link">
            Plan the quarter.
          </Link>
        </EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {shownGoals.map((g) => (
            <li key={g.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm">
                <SegmentDot accent={g.segment.accent} />
                <Link href={`/goals/${g.id}`} className="link min-w-0 flex-1 truncate">
                  {g.title}
                </Link>
              </div>
              <GoalProgress progress={g.progress} />
            </li>
          ))}
        </ul>
      )}
      {moreGoals > 0 && (
        <Link href="/quarter" className="text-primary link text-xs">
          {moreGoals} more on the Quarter page
        </Link>
      )}

      {milestones.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">Next milestones</p>
          <ul className="flex flex-col gap-1">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <span className="text-primary text-[10px]" aria-hidden>
                  ◆
                </span>
                <Link
                  href={m.goalId ? `/goals/${m.goalId}` : `/projects/${m.projectId}`}
                  className="link min-w-0 flex-1 truncate"
                >
                  {m.title}
                </Link>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {format(parseISO(m.dueDate!), 'd MMM')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  );
}
