import type { Metadata } from 'next';
import Link from 'next/link';
import { addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { PiggyBankIcon, PlusIcon, TargetIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatTiles } from '@/components/shared/stat-tile';
import { expandEvents } from '@/features/calendar/expand';
import { listEventsBetween } from '@/features/calendar/queries';
import { BudgetFormDialog } from '@/features/finance/components/budget-form-dialog';
import { BudgetList } from '@/features/finance/components/budget-list';
import { FinancialGoals } from '@/features/finance/components/financial-goals';
import {
  UpcomingActions,
  type UpcomingEvent,
} from '@/features/finance/components/upcoming-actions';
import { listBudgets } from '@/features/finance/queries';
import {
  findFinanceSegment,
  formatCurrency,
  isMeasurable,
  savingsTotal,
  totalsByPeriod,
} from '@/features/finance/summary';
import { listGoals } from '@/features/goals/queries';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { listTasks } from '@/features/tasks/queries';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';

export const metadata: Metadata = { title: 'Financial snapshot' };
export const dynamic = 'force-dynamic';

const HORIZON_DAYS = 30;

export default async function FinancePage() {
  const user = await requireUser();
  const [segments, prefs, budgets] = await Promise.all([
    listSegments(user.id),
    getPreferences(user.id),
    listBudgets(user.id),
  ]);
  const finance = findFinanceSegment(segments);
  const today = todayInZone(prefs.timeZone);
  const todayKey = toDateKey(today);
  const now = new Date();
  const horizonEnd = addDays(now, HORIZON_DAYS);

  const [goals, tasks, eventRows] = finance
    ? await Promise.all([
        listGoals(user.id, { lifeSegmentId: finance.id }),
        listTasks(user.id, {
          lifeSegmentId: finance.id,
          status: 'open',
          dueTo: toDateKey(addDays(today, HORIZON_DAYS)),
          onlyWithDueDate: true,
        }),
        listEventsBetween(user.id, now, horizonEnd),
      ])
    : [[], [], []];

  const events: UpcomingEvent[] = expandEvents(eventRows, now, horizonEnd)
    .filter((item) => item.segmentId === finance?.id)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((item) => ({
      id: item.id,
      title: item.title,
      dateKey: item.allDay
        ? item.start
        : formatInTimeZone(new Date(item.start), prefs.timeZone, 'yyyy-MM-dd'),
      time: item.allDay ? null : formatInTimeZone(new Date(item.start), prefs.timeZone, 'HH:mm'),
    }));

  const currency = prefs.currency;
  const savings = savingsTotal(goals, currency);
  const savingsGoals = goals.filter(
    (g) => isMeasurable(g) && (g.unit ?? '').toUpperCase() === currency.toUpperCase()
  ).length;
  const totals = totalsByPeriod(budgets);
  const overCount = totals.monthly.overCount + totals.annual.overCount;

  const addBudget = (
    <BudgetFormDialog
      segments={segments}
      currency={currency}
      defaultSegmentId={finance?.id}
      trigger={
        <>
          <PlusIcon data-icon="inline-start" />
          New budget
        </>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Financial snapshot"
        description="Savings goals, budgets and what is coming up, all entered by hand. Nothing here connects to a bank or any other service."
        actions={addBudget}
      />
      <div className="flex flex-col gap-6">
        <StatTiles
          stats={[
            {
              label: 'Saved towards goals',
              value: formatCurrency(savings, currency),
              hint: `${savingsGoals} goal${savingsGoals === 1 ? '' : 's'} measured in ${currency}`,
            },
            {
              label: 'Spent this month',
              value: formatCurrency(totals.monthly.spent, currency),
              hint: `of ${formatCurrency(totals.monthly.limit, currency)} in monthly budgets`,
            },
            {
              label: 'Spent this year',
              value: formatCurrency(totals.annual.spent, currency),
              hint: `of ${formatCurrency(totals.annual.limit, currency)} in annual budgets`,
            },
            {
              label: 'Over the limit',
              value: String(overCount),
              hint: overCount === 1 ? 'budget needs attention' : 'budgets need attention',
              tone: overCount > 0 ? 'destructive' : 'default',
            },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader>
              <h2 className="font-heading text-lg">Budgets</h2>
              <p className="text-muted-foreground text-sm">
                Record spending as it happens; reset a budget when its month or year starts again.
              </p>
            </CardHeader>
            <CardContent>
              {budgets.length === 0 ? (
                <EmptyState
                  icon={PiggyBankIcon}
                  title="No budgets yet"
                  description="Add a monthly or annual limit for the things you spend on."
                  action={addBudget}
                />
              ) : (
                <BudgetList budgets={budgets} segments={segments} currency={currency} />
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6 lg:col-span-5">
            <Card>
              <CardHeader>
                <h2 className="font-heading text-lg">Financial goals</h2>
                <p className="text-muted-foreground text-sm">
                  {finance
                    ? `Open goals in ${finance.name}. ${formatCurrency(savings, currency)} saved so far across goals measured in ${currency}.`
                    : 'Goals in a Finance segment show here.'}
                </p>
              </CardHeader>
              <CardContent>
                {!finance ? (
                  <EmptyState
                    icon={TargetIcon}
                    title="No Finance segment"
                    description="Create a Life Segment called Finance to track savings goals here."
                    action={
                      <Link href="/segments" className={buttonVariants({ variant: 'outline' })}>
                        Manage segments
                      </Link>
                    }
                  />
                ) : goals.length === 0 ? (
                  <EmptyState
                    icon={TargetIcon}
                    title="No financial goals yet"
                    description="Add a goal with a target amount and the progress shows here."
                    action={
                      <Link
                        href={`/goals?segment=${finance.slug}`}
                        className={buttonVariants({ variant: 'outline' })}
                      >
                        Go to goals
                      </Link>
                    }
                  />
                ) : (
                  <FinancialGoals goals={goals} todayKey={todayKey} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-heading text-lg">Upcoming financial actions</h2>
                <p className="text-muted-foreground text-sm">
                  Overdue tasks and the next {HORIZON_DAYS} days of tasks and events in your Finance
                  segment.
                </p>
              </CardHeader>
              <CardContent>
                <UpcomingActions
                  tasks={tasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate! }))}
                  events={events}
                  todayKey={todayKey}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
