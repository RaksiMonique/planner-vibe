import type { Metadata } from 'next';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, PiggyBankIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentDot } from '@/components/shared/segment-badge';
import { BudgetTaskForm } from '@/features/finance/components/budget-task-form';
import { FinishReviewForm } from '@/features/finance/components/finish-review-form';
import { InlineAmountForm } from '@/features/finance/components/inline-amount-form';
import { MonthNoteForm } from '@/features/finance/components/month-note-form';
import { ReviewReminderForm } from '@/features/finance/components/review-reminder-form';
import { listBudgets } from '@/features/finance/queries';
import { setMonthSpendingAction } from '@/features/finance/review-actions';
import {
  getFinanceReview,
  listBudgetMonths,
  listBudgetMonthsFor,
  listMonthTotals,
} from '@/features/finance/review-queries';
import {
  REVIEW_REMINDER_TITLE,
  compareWording,
  defaultTaskDue,
  figureFor,
  groupBySegment,
  monthOf,
  monthTotals,
  resetByDefault,
} from '@/features/finance/review';
import { formatCurrency, percentSpent } from '@/features/finance/summary';
import { monthLabel } from '@/features/horizons/periods';
import { parseMonthKey, shiftMonth } from '@/features/month/grid';
import { getPreferences } from '@/features/settings/service';
import { TaskRow } from '@/features/tasks/components/task-row';
import { listTasks } from '@/features/tasks/queries';
import { requireUser } from '@/lib/auth';
import { dueStatus, toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Monthly money review' };
export const dynamic = 'force-dynamic';

const HISTORY_MONTHS = 6;

export default async function FinanceReviewPage({ searchParams }: PageProps<'/finance/review'>) {
  const user = await requireUser();
  const [prefs, params] = await Promise.all([getPreferences(user.id), searchParams]);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const currentMonth = monthOf(todayKey);
  const requested = typeof params.month === 'string' ? params.month : undefined;
  const monthKey = parseMonthKey(requested) ? requested! : currentMonth;
  const isCurrent = monthKey === currentMonth;
  const previousMonth = shiftMonth(monthKey, -1);
  const currency = prefs.currency;

  const budgets = (await listBudgets(user.id)).filter((b) => b.period === 'monthly');
  const ids = budgets.map((b) => b.id);
  const [stored, previous, review, history, budgetTasks, reminders] = await Promise.all([
    listBudgetMonths(user.id, monthKey),
    listBudgetMonthsFor(user.id, previousMonth, ids),
    getFinanceReview(user.id, monthKey),
    listMonthTotals(user.id, shiftMonth(currentMonth, -(HISTORY_MONTHS - 1)), currentMonth),
    listTasks(user.id, { budgetIds: ids, status: 'open' }),
    listTasks(user.id, { status: 'open' }).then((rows) =>
      rows.filter((t) => t.title === REVIEW_REMINDER_TITLE && t.rrule)
    ),
  ]);

  const figure = (b: (typeof budgets)[number]) => figureFor(b, stored.get(b.id), isCurrent);
  const groups = groupBySegment(budgets, figure);
  const totals = monthTotals(budgets.map(figure));
  const tasksByBudget = new Map<string, typeof budgetTasks>();
  for (const t of budgetTasks) {
    if (!t.budgetId) continue;
    (tasksByBudget.get(t.budgetId) ?? tasksByBudget.set(t.budgetId, []).get(t.budgetId)!).push(t);
  }
  const done = Boolean(review?.completedAt);
  const label = monthLabel(monthKey, 'MMMM yyyy');
  const reminderDue = reminders[0]?.dueDate
    ? format(parseISO(reminders[0].dueDate), 'd MMM')
    : null;

  // The month in progress shows live totals in the history strip.
  const strip = Array.from({ length: HISTORY_MONTHS }, (_, i) =>
    shiftMonth(currentMonth, -(HISTORY_MONTHS - 1 - i))
  ).map((key) => {
    const row = history.find((h) => h.monthKey === key);
    if (key === currentMonth && !row) return { monthKey: key, ...totals, reviewed: false };
    return row ?? { monthKey: key, spent: 0, limit: 0, reviewed: false };
  });
  const stripMax = Math.max(1, ...strip.map((s) => Math.max(s.spent, s.limit)));

  const nav = (
    <div className="flex items-center gap-1">
      <Link
        href={`/finance/review?month=${previousMonth}`}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        aria-label="Previous month"
      >
        <ChevronLeftIcon />
      </Link>
      <span className="min-w-32 text-center text-sm font-medium">{label}</span>
      <Link
        href={`/finance/review?month=${shiftMonth(monthKey, 1)}`}
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        aria-label="Next month"
        aria-disabled={isCurrent || undefined}
        tabIndex={isCurrent ? -1 : undefined}
      >
        <ChevronRightIcon className={cn(isCurrent && 'opacity-40')} />
      </Link>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Monthly money review"
        description="Walk through each Life Segment's budgets for the month: set what was spent, note what happened, and leave yourself tasks for next month. Everything is typed by hand."
        actions={nav}
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col gap-4 py-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="font-heading text-2xl">{label}</h2>
              <Badge variant={done ? 'secondary' : 'outline'}>
                {done
                  ? `Reviewed ${format(review!.completedAt!, 'd MMM')}`
                  : isCurrent
                    ? 'In progress'
                    : 'Not reviewed'}
              </Badge>
              <p className="text-muted-foreground text-sm">
                {budgets.length === 0
                  ? 'No monthly budgets yet.'
                  : `${formatCurrency(totals.spent, currency)} of ${formatCurrency(totals.limit, currency)} across ${budgets.length} monthly budget${budgets.length === 1 ? '' : 's'}.`}
              </p>
              <div className="ml-auto">
                <ReviewReminderForm dueDate={reminderDue} />
              </div>
            </div>
            <div className="flex items-end gap-2" aria-label="Spending over the last six months">
              {strip.map((s) => {
                const percent = s.limit > 0 ? percentSpent(s.spent, s.limit) : 0;
                return (
                  <Link
                    key={s.monthKey}
                    href={`/finance/review?month=${s.monthKey}`}
                    className={cn(
                      'hover:bg-muted/60 flex flex-1 flex-col items-center gap-1 rounded-md p-1',
                      s.monthKey === monthKey && 'bg-secondary'
                    )}
                    title={`${monthLabel(s.monthKey, 'MMMM yyyy')}: ${formatCurrency(s.spent, currency)} of ${formatCurrency(s.limit, currency)}`}
                  >
                    <span className="flex h-16 w-full items-end justify-center gap-0.5">
                      <span
                        className="bg-card ring-input w-3 rounded-t-sm ring-1"
                        style={{ height: `${(s.limit / stripMax) * 100}%` }}
                      />
                      <span
                        className={cn('w-3 rounded-t-sm', percent > 100 ? 'bg-crimson' : 'bg-plum')}
                        style={{ height: `${(s.spent / stripMax) * 100}%` }}
                      />
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {monthLabel(s.monthKey, 'MMM')}
                      {s.reviewed ? ' ✓' : ''}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {budgets.length === 0 ? (
          <EmptyState
            icon={PiggyBankIcon}
            title="Nothing to review yet"
            description="Add a monthly budget for each thing you spend on, such as Going out or Health, and review them here each month."
            action={
              <Link href="/finance" className={buttonVariants({ variant: 'outline' })}>
                Go to the snapshot
              </Link>
            }
          />
        ) : (
          groups.map((g) => (
            <Card key={g.segment.id} data-testid="review-segment">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <SegmentDot accent={g.segment.accent} className="size-3" />
                  <h2 className="font-heading text-lg">{g.segment.name}</h2>
                  <span className="text-muted-foreground ml-auto text-sm tabular-nums">
                    {formatCurrency(g.spent, currency)} of {formatCurrency(g.limit, currency)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col divide-y">
                  {g.budgets.map((b) => {
                    const f = figure(b);
                    const code = b.currency ?? currency;
                    const prev = previous.get(b.id);
                    const own = tasksByBudget.get(b.id) ?? [];
                    const percent = f ? percentSpent(f.spent, f.limit) : 0;
                    return (
                      <li
                        key={b.id}
                        className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
                        data-testid="review-budget"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h3 className="font-sans text-sm font-medium tracking-normal">
                            {b.name}
                          </h3>
                          {b.category && (
                            <span className="text-muted-foreground text-xs">{b.category}</span>
                          )}
                          {f && (
                            <Badge
                              variant={percent > 100 ? 'destructive' : 'outline'}
                              className="ml-auto"
                            >
                              {percent}% spent
                            </Badge>
                          )}
                        </div>
                        {f ? (
                          <ProgressBar
                            value={Math.min(100, percent)}
                            valueText={`${formatCurrency(f.spent, code)} of ${formatCurrency(f.limit, code)}`}
                          />
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            No figure recorded for this month.
                          </p>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <InlineAmountForm
                              action={setMonthSpendingAction}
                              id={b.id}
                              name="amount"
                              hidden={{ month: monthKey }}
                              label={`Spent on ${b.name} in ${label}`}
                              submitLabel="Set spent"
                              defaultValue={f ? f.spent.toFixed(2) : undefined}
                              keepValue
                            />
                            <p className="text-muted-foreground text-xs">
                              {f
                                ? compareWording(
                                    f.spent,
                                    prev ? Number(prev.spentAmount) : null,
                                    code
                                  )
                                : prev
                                  ? `Last month: ${formatCurrency(prev.spentAmount, code)}.`
                                  : 'No figure for last month.'}
                            </p>
                          </div>
                          <MonthNoteForm
                            budgetId={b.id}
                            budgetName={b.name}
                            month={monthKey}
                            note={f?.note ?? null}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {own.length > 0 && (
                            <ul className="flex flex-col">
                              {own.map((t) => (
                                <li key={t.id}>
                                  <TaskRow
                                    task={t}
                                    status={dueStatus(
                                      t.dueDate,
                                      todayInZone(prefs.timeZone),
                                      prefs.weekStartsOn
                                    )}
                                    editHref={`/tasks?task=${t.id}`}
                                    compact
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                          <BudgetTaskForm
                            budgetId={b.id}
                            budgetName={b.name}
                            month={monthKey}
                            defaultDue={defaultTaskDue(monthKey, todayKey)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))
        )}

        {budgets.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-heading text-lg">Finish {label}</h2>
              <p className="text-muted-foreground text-sm">
                Puts this month&apos;s figures on record for every monthly budget and marks the
                review done. You can come back and update it.
              </p>
            </CardHeader>
            <CardContent>
              <FinishReviewForm
                month={monthKey}
                note={review?.note ?? null}
                done={done}
                resetDefault={resetByDefault(monthKey, todayKey)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
