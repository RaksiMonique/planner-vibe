import Link from 'next/link';
import { addDays, format, parseISO } from 'date-fns';
import { UtensilsIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { toDateKey, type WeekStartsOn } from '@/lib/dates';
import { pickPlannedDay } from '../plan-preview';
import { getMealsBetween } from '../queries';
import { SLOT_LABELS } from '../schema';
import { weekKeysFor } from '../service';

const PREVIEW = 6;

/** Today's planned meals, or the next planned day this week when today is empty. */
export async function MealsDashboardCard({
  userId,
  todayKey,
  weekStartsOn,
}: {
  userId: string;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
}) {
  const { startKey, endKey } = weekKeysFor(todayKey, weekStartsOn);
  const { entries } = await getMealsBetween(userId, startKey, endKey);
  const day = pickPlannedDay(entries, todayKey);
  const shown = day?.entries.slice(0, PREVIEW) ?? [];
  const more = (day?.entries.length ?? 0) - shown.length;
  const tomorrowKey = toDateKey(addDays(parseISO(todayKey), 1));
  const dayWord =
    day && !day.isToday
      ? day.dateKey === tomorrowKey
        ? 'Tomorrow'
        : format(parseISO(day.dateKey), 'EEEE')
      : '';

  return (
    <DashboardCard title="Meals" icon={UtensilsIcon} href="/meals" release={6}>
      {!day ? (
        <EmptyNote>
          {entries.length === 0
            ? 'No meals planned this week.'
            : 'The rest of the week is unplanned.'}{' '}
          <Link href="/meals" className="text-primary link">
            Plan the week.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {day.isToday ? "Today's meals." : `Nothing planned today. ${dayWord} looks like this.`}
          </p>
          <ul className="flex flex-col gap-1.5">
            {shown.map((e) => (
              <li key={e.id} className="flex items-baseline gap-2 text-sm">
                <span className="text-muted-foreground w-18 shrink-0 text-xs">
                  {SLOT_LABELS[e.slot]}
                </span>
                {e.recipe ? (
                  <Link
                    href={`/meals/recipes/${e.recipe.id}`}
                    className="link min-w-0 flex-1 truncate"
                  >
                    {e.recipe.title}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate">{e.customMeal}</span>
                )}
                {e.servings > 1 && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {e.servings} servings
                  </span>
                )}
              </li>
            ))}
          </ul>
          {more > 0 && (
            <Link href="/meals" className="text-primary link text-xs">
              {more} more on the Meals page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
