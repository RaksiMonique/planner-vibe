import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import type { DashboardLayout, EnabledModules } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { DASHBOARD_CARDS, normaliseLayout } from '@/features/dashboard/layout';
import { cn } from '@/lib/utils';
import {
  moveDashboardCardAction,
  resetDashboardLayoutAction,
  toggleDashboardCardAction,
} from '../actions';

/** Reorder and hide dashboard cards (instructions.md 7.5). Plain forms, one per control. */
export function DashboardLayoutForm({
  layout,
  enabledModules,
}: {
  layout: DashboardLayout | null;
  enabledModules: EnabledModules;
}) {
  const { order, hidden } = normaliseLayout(layout);
  const byKey = new Map(DASHBOARD_CARDS.map((c) => [c.key, c]));
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col divide-y">
        {order.map((key, i) => {
          const card = byKey.get(key as (typeof DASHBOARD_CARDS)[number]['key'])!;
          const isHidden = hidden.includes(key);
          const moduleOff = card.module
            ? enabledModules[card.module as keyof EnabledModules] === false
            : false;
          return (
            <li key={key} className="flex items-center gap-1.5 py-1.5 text-sm">
              <span
                className={cn(
                  'min-w-0 flex-1 truncate',
                  isHidden && 'text-muted-foreground line-through'
                )}
              >
                {card.label}
                {moduleOff && <span className="text-muted-foreground text-xs"> (module off)</span>}
              </span>
              <form action={moveDashboardCardAction}>
                <input type="hidden" name="key" value={key} />
                <input type="hidden" name="direction" value="-1" />
                <Button
                  type="submit"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Move ${card.label} up`}
                  disabled={i === 0}
                >
                  <ArrowUpIcon />
                </Button>
              </form>
              <form action={moveDashboardCardAction}>
                <input type="hidden" name="key" value={key} />
                <input type="hidden" name="direction" value="1" />
                <Button
                  type="submit"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Move ${card.label} down`}
                  disabled={i === order.length - 1}
                >
                  <ArrowDownIcon />
                </Button>
              </form>
              <form action={toggleDashboardCardAction}>
                <input type="hidden" name="key" value={key} />
                <input type="hidden" name="visible" value={isHidden ? '1' : '0'} />
                <Button
                  type="submit"
                  size="xs"
                  variant="outline"
                  aria-label={`${isHidden ? 'Show' : 'Hide'} ${card.label}`}
                  className="w-14"
                >
                  {isHidden ? 'Show' : 'Hide'}
                </Button>
              </form>
            </li>
          );
        })}
      </ol>
      <form action={resetDashboardLayoutAction}>
        <Button type="submit" size="sm" variant="ghost">
          Reset to default
        </Button>
      </form>
    </div>
  );
}
