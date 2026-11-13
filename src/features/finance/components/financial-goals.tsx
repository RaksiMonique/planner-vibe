import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { GoalProgress } from '@/features/goals/components/goal-progress';
import type { GoalRow } from '@/features/goals/queries';
import { HORIZON_LABELS } from '@/features/goals/schema';
import { updateGoalProgressAction } from '../actions';
import { formatAmount, isMeasurable, toAmount } from '../summary';
import { InlineAmountForm } from './inline-amount-form';

export function FinancialGoals({ goals, todayKey }: { goals: GoalRow[]; todayKey: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {goals.map((g) => {
        const measurable = isMeasurable(g);
        const overdue = g.targetDate !== null && g.targetDate < todayKey;
        return (
          <li
            key={g.id}
            className="bg-card flex flex-col gap-2 rounded-xl border p-3"
            data-testid="financial-goal"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="min-w-0 flex-1 font-sans text-sm font-medium tracking-normal">
                <Link href={`/goals/${g.id}`} className="hover:underline">
                  {g.title}
                </Link>
              </h3>
              <Badge variant="outline">{HORIZON_LABELS[g.horizon]}</Badge>
            </div>
            <GoalProgress
              progress={g.progress}
              valueText={
                measurable
                  ? `${formatAmount(g.currentValue)} / ${formatAmount(g.targetValue)}${g.unit ? ` ${g.unit}` : ''}`
                  : undefined
              }
              valueClassName="text-foreground"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                {g.targetDate ? (
                  <span className={overdue ? 'text-destructive' : undefined}>
                    Target {format(parseISO(g.targetDate), 'd MMM yyyy')}
                  </span>
                ) : (
                  'No target date'
                )}
              </p>
              {measurable ? (
                <InlineAmountForm
                  action={updateGoalProgressAction}
                  id={g.id}
                  name="currentValue"
                  label={`Update progress for ${g.title}`}
                  submitLabel="Update progress"
                  defaultValue={String(toAmount(g.currentValue))}
                  keepValue
                />
              ) : (
                <Link href={`/goals/${g.id}`} className="text-primary text-xs hover:underline">
                  Open goal
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
