import { PencilIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentDot } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import type { SegmentRef } from '@/features/life-segments/types';
import { cn } from '@/lib/utils';
import { deleteBudgetAction, recordSpendingAction, resetBudgetAction } from '../actions';
import type { BudgetRow } from '../queries';
import { BUDGET_PERIOD_LABELS } from '../schema';
import { formatCurrency, isOverLimit, percentSpent, remaining } from '../summary';
import { BudgetFormDialog } from './budget-form-dialog';
import { InlineAmountForm } from './inline-amount-form';

export function BudgetList({
  budgets,
  segments,
  currency,
}: {
  budgets: BudgetRow[];
  segments: SegmentRef[];
  /** The user's preference currency, used when a budget carries none. */
  currency: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {budgets.map((b) => {
        const code = b.currency ?? currency;
        const over = isOverLimit(b.spentAmount, b.limitAmount);
        const percent = percentSpent(b.spentAmount, b.limitAmount);
        const left = remaining(b.spentAmount, b.limitAmount);
        return (
          <li
            key={b.id}
            className="bg-card flex flex-col gap-2 rounded-xl border p-3"
            data-testid="budget-row"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <SegmentDot accent={b.segment.accent} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-sans text-sm font-medium tracking-normal">{b.name}</h3>
                <p className="text-muted-foreground text-xs">
                  {[b.category, BUDGET_PERIOD_LABELS[b.period], b.segment.name]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <Badge variant={over ? 'destructive' : 'outline'}>{percent}% spent</Badge>
              <span className="flex items-center">
                <BudgetFormDialog
                  budget={b}
                  segments={segments}
                  currency={currency}
                  variant="ghost"
                  size="icon-xs"
                  trigger={
                    <>
                      <PencilIcon />
                      <span className="sr-only">Edit {b.name}</span>
                    </>
                  }
                />
                <ConfirmActionButton
                  action={resetBudgetAction}
                  fields={{ id: b.id }}
                  title={`Reset "${b.name}" for a new period?`}
                  description="Spending goes back to zero. The limit stays as it is."
                  confirmLabel="Reset period"
                  variant="ghost"
                  size="icon-xs"
                  trigger={
                    <>
                      <RotateCcwIcon />
                      <span className="sr-only">Reset period for {b.name}</span>
                    </>
                  }
                />
                <ConfirmActionButton
                  action={deleteBudgetAction}
                  fields={{ id: b.id }}
                  title={`Delete "${b.name}"?`}
                  variant="ghost"
                  size="icon-xs"
                  trigger={
                    <>
                      <Trash2Icon />
                      <span className="sr-only">Delete {b.name}</span>
                    </>
                  }
                />
              </span>
            </div>
            <ProgressBar
              value={Math.min(100, percent)}
              valueText={`${formatCurrency(b.spentAmount, code)} of ${formatCurrency(b.limitAmount, code)}`}
              className={cn(over && '[&_[data-slot=progress-indicator]]:bg-destructive')}
              valueClassName="text-foreground"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={cn('text-xs', over ? 'text-destructive' : 'text-muted-foreground')}>
                {over
                  ? `${formatCurrency(-left, code)} over the limit`
                  : `${formatCurrency(left, code)} remaining`}
              </p>
              <InlineAmountForm
                action={recordSpendingAction}
                id={b.id}
                name="amount"
                label={`Record spending for ${b.name}`}
                submitLabel="Record"
                min={0.01}
              />
            </div>
            {b.note && <p className="text-muted-foreground text-xs">{b.note}</p>}
          </li>
        );
      })}
    </ul>
  );
}
