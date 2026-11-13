import type { Metadata } from 'next';
import Link from 'next/link';
import { ActivityIcon, PlusIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentDot } from '@/components/shared/segment-badge';
import { HabitCard, habitAccent, streakLabel } from '@/features/habits/components/habit-card';
import { HabitFormDialog } from '@/features/habits/components/habit-form-dialog';
import { HabitMonthCalendar } from '@/features/habits/components/habit-month-calendar';
import { HabitToggle } from '@/features/habits/components/habit-toggle';
import { buildHabitsHref } from '@/features/habits/hrefs';
import { getHabitOverview } from '@/features/habits/queries';
import { PERIOD_NOUN } from '@/features/habits/schema';
import { SegmentFilter } from '@/features/life-segments/components/segment-filter';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone, weekDays } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Habits' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function HabitsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const segmentSlug = str(params.segment);
  const showArchived = params.archived === '1';
  const habitParam = str(params.habit);

  const [segments, prefs] = await Promise.all([listSegments(user.id), getPreferences(user.id)]);
  const today = todayInZone(prefs.timeZone);
  const todayKey = toDateKey(today);
  const weekKeys = weekDays(today, prefs.weekStartsOn).map(toDateKey);
  const monthKey = /^\d{4}-\d{2}$/.test(str(params.month) ?? '')
    ? (str(params.month) as string)
    : todayKey.slice(0, 7);

  const segment = segments.find((s) => s.slug === segmentSlug);
  const all = await getHabitOverview(user.id, todayKey, prefs.weekStartsOn, {
    includeArchived: true,
  });
  const filtered = segment ? all.filter((h) => h.lifeSegmentId === segment.id) : all;
  const active = filtered.filter((h) => h.archivedAt === null);
  const archived = filtered.filter((h) => h.archivedAt !== null);
  const selected = active.find((h) => h.id === habitParam) ?? active[0];
  const doneToday = active.filter((h) => h.doneToday).length;

  const keep = {
    segment: segment?.slug,
    month: monthKey === todayKey.slice(0, 7) ? undefined : monthKey,
    habit: habitParam,
  };

  return (
    <>
      <PageHeader
        title="Habits"
        description="Small repeated behaviours. Check in daily; streaks and rates follow."
        actions={
          <>
            <Link
              href={buildHabitsHref({ ...keep, archived: showArchived ? undefined : '1' })}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {showArchived ? 'Hide archived' : `Archived (${archived.length})`}
            </Link>
            <HabitFormDialog
              segments={segments}
              defaultSegmentId={segment?.id}
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  New habit
                </>
              }
            />
          </>
        }
      />
      <SegmentFilter
        basePath="/habits"
        segments={segments}
        current={segment?.slug}
        extra={{ month: keep.month, archived: showArchived ? '1' : undefined }}
      />

      {active.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No habits yet"
          description="Add one small behaviour you want to repeat, then check it off each day."
          action={
            <HabitFormDialog
              segments={segments}
              defaultSegmentId={segment?.id}
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  New habit
                </>
              }
            />
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">
              Today{' '}
              <span className="text-muted-foreground text-sm">
                {doneToday} of {active.length} done
              </span>
            </h3>
            <Card>
              <CardContent className="flex flex-col gap-2">
                <ProgressBar
                  value={Math.round((doneToday / active.length) * 100)}
                  valueText={`${doneToday}/${active.length}`}
                />
                <ul className="flex flex-col gap-1.5">
                  {active.map((h) => (
                    <li key={h.id} className="flex items-center gap-2.5 text-sm">
                      <HabitToggle
                        key={`${h.id}:${todayKey}:${h.doneToday}`}
                        habitId={h.id}
                        dateKey={todayKey}
                        done={h.doneToday}
                        label={
                          h.doneToday
                            ? `Remove today's check-in for ${h.name}`
                            : `Check in ${h.name}`
                        }
                      />
                      <SegmentDot accent={habitAccent(h)} />
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate',
                          h.doneToday && 'text-muted-foreground line-through'
                        )}
                      >
                        {h.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {h.frequency === 'daily'
                          ? streakLabel(h)
                          : `${h.stats.period.count}/${h.stats.period.target} this ${PERIOD_NOUN[h.frequency]}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">This week</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {active.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  weekKeys={weekKeys}
                  todayKey={todayKey}
                  segments={segments}
                />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">Month</h3>
            <HabitMonthCalendar
              habit={selected}
              habits={active}
              monthKey={monthKey}
              todayKey={todayKey}
              weekStartsOn={prefs.weekStartsOn}
              params={{ ...keep, archived: showArchived ? '1' : undefined }}
            />
          </section>
        </div>
      )}

      {showArchived && (
        <section className="mt-8 flex flex-col gap-3">
          <h3 className="font-heading text-xl">Archived</h3>
          {archived.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing archived.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {archived.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  weekKeys={weekKeys}
                  todayKey={todayKey}
                  segments={segments}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
