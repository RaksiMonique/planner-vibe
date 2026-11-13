import Link from 'next/link';
import { progressText } from '@/features/goals/progress';
import { HORIZON_LABELS } from '@/features/goals/schema';
import { cn } from '@/lib/utils';
import { monthLabel } from '../periods';
import { buildLanes, timelineWindow, type TimelineGoal } from '../timeline';

/**
 * Every horizon on one axis (instructions.md 7.2): a lane per horizon, a
 * column per month (or per year for long spans), each goal in the column of
 * its target date and linking to its page.
 */
export function GoalTimeline({
  goals,
  todayKey,
  highlightId,
}: {
  goals: TimelineGoal[];
  todayKey: string;
  highlightId?: string;
}) {
  if (goals.length === 0) {
    return <p className="text-muted-foreground text-sm">No goals to place on a timeline yet.</p>;
  }
  const window = timelineWindow(goals, todayKey);
  const lanes = buildLanes(goals, window).filter((l) => l.placed.length || l.undated.length);
  const grid = {
    gridTemplateColumns: `repeat(${window.columns.length}, minmax(4.5rem, 1fr))`,
    gridAutoFlow: 'row dense' as const,
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div className="flex items-end">
          <div className="w-24 shrink-0" aria-hidden />
          <div className="grid flex-1 gap-x-1 text-xs" style={grid}>
            {window.columns.map((column, i) => (
              <div
                key={column}
                className={cn(
                  'border-b px-1 pb-1 text-center',
                  i === window.todayColumn && 'text-primary border-primary font-medium'
                )}
              >
                {window.unit === 'month'
                  ? monthLabel(column, i === 0 || column.endsWith('-01') ? 'MMM yy' : 'MMM')
                  : column}
              </div>
            ))}
          </div>
        </div>
        {lanes.map((lane) => (
          <div key={lane.horizon} className="flex border-b py-2">
            <div className="text-muted-foreground w-24 shrink-0 pr-2 text-xs font-medium">
              {HORIZON_LABELS[lane.horizon]}
            </div>
            <div className="flex-1">
              <div className="grid gap-1" style={grid}>
                {lane.placed.map(({ goal, column }) => (
                  <Link
                    key={goal.id}
                    href={`/goals/${goal.id}`}
                    title={goal.title}
                    style={{ gridColumn: column + 1 }}
                    className={cn(
                      'bg-card hover:bg-muted/40 block min-w-0 rounded-md border px-1.5 py-1 text-xs',
                      highlightId === goal.id && 'ring-primary ring-2'
                    )}
                  >
                    <span className="block truncate">{goal.title}</span>
                    <span className="text-muted-foreground">{progressText(goal.progress)}</span>
                  </Link>
                ))}
              </div>
              {lane.undated.length > 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  No target date:{' '}
                  {lane.undated.map((g, i) => (
                    <span key={g.id}>
                      {i > 0 && ', '}
                      <Link href={`/goals/${g.id}`} className="underline-offset-4 hover:underline">
                        {g.title}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
