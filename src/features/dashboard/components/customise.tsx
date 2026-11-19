import Link from 'next/link';
import { ArrowDownIcon, ArrowUpIcon, EyeOffIcon, PlusIcon } from 'lucide-react';
import type { EnabledModules } from '@/db/schema';
import { Button } from '@/components/ui/button';
import {
  moveDashboardCardAction,
  resetDashboardLayoutAction,
  toggleDashboardCardAction,
} from '@/features/settings/actions';
import { CARD_GROUPS, DASHBOARD_CARDS, type CardDefinition } from '../layout';

/**
 * Edit mode for the dashboard (instructions.md 7.5). Each shown card gets a
 * strip above it to move or hide it, and hidden cards wait in a row at the
 * bottom to be added back. Plain forms on the Settings actions, so it works
 * without JavaScript and on a phone.
 */
export function CardControls({
  card,
  first,
  last,
}: {
  card: CardDefinition;
  first: boolean;
  last: boolean;
}) {
  return (
    <div
      data-slot="card-controls"
      className="border-input bg-card flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
    >
      <span className="tracking-eyebrow min-w-0 flex-1 truncate uppercase">{card.label}</span>
      <form action={moveDashboardCardAction}>
        <input type="hidden" name="key" value={card.key} />
        <input type="hidden" name="direction" value="-1" />
        <input type="hidden" name="among" value="visible" />
        <Button
          type="submit"
          size="icon-xs"
          variant="ghost"
          aria-label={`Move ${card.label} up`}
          disabled={first}
        >
          <ArrowUpIcon />
        </Button>
      </form>
      <form action={moveDashboardCardAction}>
        <input type="hidden" name="key" value={card.key} />
        <input type="hidden" name="direction" value="1" />
        <input type="hidden" name="among" value="visible" />
        <Button
          type="submit"
          size="icon-xs"
          variant="ghost"
          aria-label={`Move ${card.label} down`}
          disabled={last}
        >
          <ArrowDownIcon />
        </Button>
      </form>
      <form action={toggleDashboardCardAction}>
        <input type="hidden" name="key" value={card.key} />
        <input type="hidden" name="visible" value="0" />
        <Button type="submit" size="icon-xs" variant="ghost" aria-label={`Hide ${card.label}`}>
          <EyeOffIcon />
        </Button>
      </form>
    </div>
  );
}

export function AddCards({
  hidden,
  enabledModules,
}: {
  hidden: string[];
  enabledModules: EnabledModules;
}) {
  const available = DASHBOARD_CARDS.filter((c) => hidden.includes(c.key));
  const off = available.filter(
    (c) => c.module && enabledModules[c.module as keyof EnabledModules] === false
  );
  const addable = available.filter((c) => !off.includes(c));
  return (
    <div
      data-slot="add-cards"
      className="border-input bg-card flex flex-col gap-3 rounded-md border border-dashed p-4 lg:col-span-3"
    >
      <p className="font-heading text-lg">Add a card</p>
      {addable.length === 0 ? (
        <p className="text-muted-foreground text-sm">Every card is on the page.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {CARD_GROUPS.filter((g) => addable.some((c) => c.group === g)).map((group) => (
            <div key={group} className="flex flex-col gap-1.5">
              <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">{group}</p>
              <ul className="flex flex-wrap gap-2">
                {addable
                  .filter((c) => c.group === group)
                  .map((card) => (
                    <li key={card.key}>
                      <form action={toggleDashboardCardAction}>
                        <input type="hidden" name="key" value={card.key} />
                        <input type="hidden" name="visible" value="1" />
                        <Button type="submit" size="sm" variant="outline" title={card.description}>
                          <PlusIcon data-icon="inline-start" />
                          {card.label}
                        </Button>
                      </form>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {off.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {off.map((c) => c.label).join(', ')} {off.length === 1 ? 'belongs' : 'belong'} to a module
          that is switched off in{' '}
          <Link href="/settings" className="link">
            Settings
          </Link>
          .
        </p>
      )}
      <form action={resetDashboardLayoutAction}>
        <Button type="submit" size="sm" variant="ghost">
          Reset to default
        </Button>
      </form>
    </div>
  );
}
