import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { cn } from '@/lib/utils';
import type { GoalRow } from '../queries';
import { GoalProgress } from './goal-progress';
import { GOAL_STATUS_LABELS, HORIZON_LABELS } from '../schema';

export function GoalCard({ goal, todayKey }: { goal: GoalRow; todayKey: string }) {
  const closed = goal.status === 'achieved' || goal.status === 'abandoned';
  const overdue = !closed && goal.targetDate !== null && goal.targetDate < todayKey;
  return (
    <Link href={`/goals/${goal.id}`} className="block h-full">
      <Card
        size="sm"
        className={cn('hover:bg-muted/40 h-full transition-colors', closed && 'opacity-75')}
      >
        <CardContent className="flex h-full flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <SegmentBadge name={goal.segment.name} accent={goal.segment.accent} />
            <Badge variant="outline">{HORIZON_LABELS[goal.horizon]}</Badge>
            {goal.status !== 'active' && (
              <Badge variant="secondary">{GOAL_STATUS_LABELS[goal.status]}</Badge>
            )}
          </div>
          <p className="font-heading text-lg leading-snug">{goal.title}</p>
          <GoalProgress progress={goal.progress} />
          <div className="text-muted-foreground mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {goal.targetDate && (
              <span className={cn(overdue && 'text-destructive')}>
                Target {format(parseISO(goal.targetDate), 'd MMM yyyy')}
              </span>
            )}
            {goal.childCount > 0 && <span>{goal.childCount} sub-goals</span>}
            {goal.milestoneTotal > 0 && (
              <span>
                {goal.milestoneDone}/{goal.milestoneTotal} milestones
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
