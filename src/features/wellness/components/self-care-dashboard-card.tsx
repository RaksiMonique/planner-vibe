import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { SparklesIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { toDateKey, weekDays, type WeekStartsOn } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { listWellnessBetween } from '../queries';
import { TreatmentToggle } from './treatment-planner';

const PREVIEW = 5;

/** Today's planned treatments with a done toggle, then the rest of the week's plan. */
export async function SelfCareDashboardCard({
  userId,
  todayKey,
  weekStartsOn,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const weekKeys = weekDays(parseISO(todayKey), weekStartsOn).map(toDateKey);
  const treatments = await listWellnessBetween(userId, weekKeys[0], weekKeys[6], ['treatment']);
  const today = treatments.filter((t) => t.date === todayKey);
  const rest = treatments.filter((t) => t.date !== todayKey);
  const shown = rest.slice(0, PREVIEW);
  const more = rest.length - shown.length;
  const done = treatments.filter((t) => t.value !== null).length;

  return (
    <DashboardCard title="Self-care" icon={SparklesIcon} href="/wellness/self-care" release={6}>
      {treatments.length === 0 ? (
        <EmptyNote>
          No treatments planned this week.{' '}
          <Link href="/wellness/self-care" className="text-primary link">
            Plan one.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {done} of {treatments.length} done this week.
          </p>
          {today.length === 0 ? (
            <EmptyNote>Nothing planned for today.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {today.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <TreatmentToggle
                    id={t.id}
                    done={t.value !== null}
                    label={t.label ?? 'treatment'}
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate',
                      t.value !== null && 'text-muted-foreground line-through'
                    )}
                  >
                    {t.label}
                  </span>
                  <span className="text-muted-foreground text-xs">Today</span>
                </li>
              ))}
            </ul>
          )}
          {shown.length > 0 && (
            <ul className="flex flex-col gap-1 border-t pt-2">
              {shown.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-11 shrink-0 tabular-nums">
                    {format(parseISO(t.date), 'EEE d')}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate',
                      t.value !== null && 'text-muted-foreground line-through'
                    )}
                  >
                    {t.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {more > 0 && (
            <Link href="/wellness/self-care" className="text-primary link text-xs">
              {more} more on the Self-care page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
