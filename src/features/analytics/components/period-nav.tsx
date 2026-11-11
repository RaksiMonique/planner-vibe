import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  analyticsHref,
  CURRENT_PERIOD_LABELS,
  PERIOD_LABELS,
  PERIODS,
  switchPeriodHref,
  type ResolvedPeriod,
} from '../period';

/** Month, quarter or year, with previous, current and next links. */
export function AnalyticsPeriodNav({
  period,
  todayKey,
}: {
  period: ResolvedPeriod;
  todayKey: string;
}) {
  const noun = PERIOD_LABELS[period.period].toLowerCase();
  return (
    <nav aria-label="Period" className="flex flex-wrap items-center gap-2">
      <div className="bg-card flex rounded-lg border p-0.5" role="group" aria-label="Period length">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={switchPeriodHref(period, p, todayKey)}
            aria-current={period.period === p ? 'page' : undefined}
            className={buttonVariants({
              variant: period.period === p ? 'secondary' : 'ghost',
              size: 'sm',
            })}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Link
          href={analyticsHref(period.period, period.prevKey)}
          className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
          aria-label={`Previous ${noun}`}
        >
          <ChevronLeftIcon />
        </Link>
        <Link
          href={analyticsHref(period.period)}
          aria-current={period.isCurrent ? 'page' : undefined}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {CURRENT_PERIOD_LABELS[period.period]}
        </Link>
        <Link
          href={analyticsHref(period.period, period.nextKey)}
          className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
          aria-label={`Next ${noun}`}
        >
          <ChevronRightIcon />
        </Link>
      </div>
      <h3 className="font-heading w-full text-xl sm:ml-auto sm:w-auto">{period.label}</h3>
    </nav>
  );
}
