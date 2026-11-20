import Link from 'next/link';
import { formatInTimeZone } from 'date-fns-tz';
import { PiggyBankIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { listGoals } from '@/features/goals/queries';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import type { WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { listBudgets } from '../queries';
import { monthOf } from '../review';
import { getFinanceReview } from '../review-queries';
import {
  findFinanceSegment,
  formatCurrency,
  isMeasurable,
  savingsTotal,
  totalsByPeriod,
} from '../summary';

type Figure = { key: string; label: string; value: string; hint: string; warn?: boolean };

/**
 * The headline figures of the Financial snapshot, all typed in by hand on the
 * Finance page. Nothing here reads from a bank or any other application.
 */
export async function FinanceDashboardCard({
  userId,
  todayKey,
  timeZone,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const [segments, prefs, budgets, review] = await Promise.all([
    listSegments(userId),
    getPreferences(userId),
    listBudgets(userId),
    getFinanceReview(userId, monthOf(todayKey)),
  ]);
  const finance = findFinanceSegment(segments);
  const goals = finance ? await listGoals(userId, { lifeSegmentId: finance.id }) : [];
  const currency = prefs.currency;
  const measurable = goals.filter(isMeasurable);
  const totals = totalsByPeriod(budgets);
  const overCount = totals.monthly.overCount + totals.annual.overCount;

  const updatedAt = [...budgets, ...measurable]
    .map((row) => row.updatedAt)
    .reduce<Date | null>((latest, d) => (latest === null || d > latest ? d : latest), null);

  const figures: Figure[] = [
    {
      key: 'savings',
      label: 'Saved towards goals',
      value: formatCurrency(savingsTotal(goals, currency), currency),
      hint: `${measurable.length} measurable goal${measurable.length === 1 ? '' : 's'}`,
    },
    {
      key: 'spent',
      label: 'Spent this month',
      value: formatCurrency(totals.monthly.spent, currency),
      hint: `of ${formatCurrency(totals.monthly.limit, currency)} budgeted`,
    },
    {
      key: 'left',
      label: 'Left this month',
      value: formatCurrency(totals.monthly.remaining, currency),
      hint: `${totals.monthly.count} monthly budget${totals.monthly.count === 1 ? '' : 's'}`,
      warn: totals.monthly.remaining < 0,
    },
    {
      key: 'over',
      label: 'Over the limit',
      value: String(overCount),
      hint: overCount === 1 ? 'budget needs attention' : 'budgets need attention',
      warn: overCount > 0,
    },
  ];

  return (
    <DashboardCard title="Financial snapshot" icon={PiggyBankIcon} href="/finance" release={6}>
      {budgets.length === 0 && measurable.length === 0 ? (
        <EmptyNote>
          No figures yet.{' '}
          <Link href="/finance" className="text-primary link">
            Add a budget.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            {figures.map((f) => (
              <div key={f.key} className="flex flex-col rounded-lg border px-3 py-2">
                <dt className="text-muted-foreground text-xs">{f.label}</dt>
                <dd
                  className={cn(
                    'font-heading text-lg leading-tight tabular-nums',
                    f.warn && 'text-destructive'
                  )}
                >
                  {f.value}
                </dd>
                <dd className="text-muted-foreground text-xs">{f.hint}</dd>
              </div>
            ))}
          </dl>
          {updatedAt && (
            <p className="text-muted-foreground text-xs">
              Figures last updated {formatInTimeZone(updatedAt, timeZone, 'd MMM')}.
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            {review?.completedAt
              ? `This month reviewed ${formatInTimeZone(review.completedAt, timeZone, 'd MMM')}. `
              : "This month's money review is still open. "}
            <Link href="/finance/review" className="text-primary link">
              {review?.completedAt ? 'Open it' : 'Review now'}
            </Link>
          </p>
        </>
      )}
    </DashboardCard>
  );
}
