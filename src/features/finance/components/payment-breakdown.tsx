import { cn } from '@/lib/utils';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../schema';
import { type BudgetLike, formatCurrency, totalsByPayment } from '../summary';

/**
 * How much is still to go out by cash, credit and transfer, so the user knows
 * how much cash to have ready. Budgets with no method are shown as "Not set".
 * Nothing shows until at least one budget has a method.
 */
export function PaymentBreakdown({
  budgets,
  currency,
  compact = false,
  className,
}: {
  budgets: BudgetLike[];
  currency: string;
  compact?: boolean;
  className?: string;
}) {
  const by = totalsByPayment(budgets);
  if (PAYMENT_METHODS.every((m) => by[m].count === 0)) return null;
  const lines = [...PAYMENT_METHODS, 'unset' as const]
    .map((m) => ({ key: m, label: m === 'unset' ? 'Not set' : PAYMENT_METHOD_LABELS[m], ...by[m] }))
    .filter((l) => l.count > 0);
  if (compact) {
    return (
      <p className={cn('text-muted-foreground text-xs', className)} data-testid="paid-by">
        Paid by{' '}
        {lines.map((l, i) => (
          <span key={l.key}>
            {i > 0 && ' · '}
            <span className="text-foreground">{l.label}</span>{' '}
            <span className="tabular-nums">
              {formatCurrency(l.spent, currency)} of {formatCurrency(l.limit, currency)}
            </span>
          </span>
        ))}
      </p>
    );
  }
  return (
    <dl
      className={cn('grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-2', className)}
      data-testid="paid-by"
      aria-label="Paid by"
    >
      {lines.map((l) => (
        <div key={l.key} className="flex flex-col gap-0.5 rounded-lg border px-3 py-2">
          <dt className="text-muted-foreground text-xs">
            {l.label} · {l.count} budget{l.count === 1 ? '' : 's'}
          </dt>
          <dd
            className={cn(
              'text-base font-semibold tabular-nums',
              l.remaining < 0 && 'text-destructive'
            )}
          >
            {l.remaining < 0
              ? `${formatCurrency(-l.remaining, currency)} over`
              : `${formatCurrency(l.remaining, currency)} ${l.key === 'cash' ? 'to have ready' : 'left'}`}
          </dd>
          <dd className="text-muted-foreground text-xs">
            {formatCurrency(l.spent, currency)} spent of {formatCurrency(l.limit, currency)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
