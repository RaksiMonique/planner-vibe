import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  ExternalLinkIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { deleteHabitAction, setHabitArchivedAction } from '@/features/habits/actions';
import { HabitRates, StreakBadge, habitAccent } from '@/features/habits/components/habit-card';
import { HabitFormDialog } from '@/features/habits/components/habit-form-dialog';
import { HabitPlan } from '@/features/habits/components/habit-plan';
import { HabitToggle } from '@/features/habits/components/habit-toggle';
import { nextUpText } from '@/features/habits/components/next-up';
import { buildHabitsHref } from '@/features/habits/hrefs';
import {
  getHabitOverviewById,
  listHabitLinkOptions,
  listPlanItems,
} from '@/features/habits/queries';
import { FREQUENCY_LABELS, PERIOD_NOUN } from '@/features/habits/schema';
import { daysCheckedIn, isFutureKey } from '@/features/habits/streaks';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone, weekDays } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Habit' };
export const dynamic = 'force-dynamic';

/**
 * One habit's page: what to do next, how it goes, what it is linked to, and
 * its record. The answer to "it's study time, where do I start?" (8.2).
 */
export default async function HabitPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [segments, prefs] = await Promise.all([listSegments(user.id), getPreferences(user.id)]);
  const today = todayInZone(prefs.timeZone);
  const todayKey = toDateKey(today);
  const [habit, items, links] = await Promise.all([
    getHabitOverviewById(user.id, id, todayKey, prefs.weekStartsOn),
    listPlanItems(user.id, id),
    listHabitLinkOptions(user.id),
  ]);
  if (!habit) notFound();

  const archived = habit.archivedAt !== null;
  const weekKeys = weekDays(today, prefs.weekStartsOn).map(toDateKey);
  const checkIns = new Set(habit.checkInDates);
  const { period } = habit.stats;
  const next = nextUpText(habit, todayKey);
  const missed = habit.stats.currentStreak === 0 && habit.stats.longestStreak > 0;

  return (
    <>
      <Link
        href="/habits"
        className="text-muted-foreground link mb-3 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        Habits
      </Link>
      <PageHeader
        title={habit.name}
        description={`${FREQUENCY_LABELS[habit.frequency]}${
          habit.target > 1 ? `, ${habit.target}× per ${PERIOD_NOUN[habit.frequency]}` : ''
        }${habit.reminderTime ? ` · reminder at ${habit.reminderTime.slice(0, 5)}` : ''}`}
        actions={
          <>
            {!archived && (
              <label className="flex h-8 items-center gap-2 rounded-lg border px-2.5 text-sm">
                <HabitToggle
                  key={`${habit.id}:${todayKey}:${habit.doneToday}`}
                  habitId={habit.id}
                  dateKey={todayKey}
                  done={habit.doneToday}
                  label={
                    habit.doneToday
                      ? `Remove today's check-in for ${habit.name}`
                      : `Check in ${habit.name}`
                  }
                />
                Done today
              </label>
            )}
            <HabitFormDialog
              segments={segments}
              links={links}
              habit={habit}
              variant="outline"
              trigger={
                <>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </>
              }
            />
            <form action={setHabitArchivedAction}>
              <input type="hidden" name="id" value={habit.id} />
              <input type="hidden" name="archived" value={archived ? 'false' : 'true'} />
              <Button type="submit" variant="ghost" size="sm">
                {archived ? (
                  <ArchiveRestoreIcon data-icon="inline-start" />
                ) : (
                  <ArchiveIcon data-icon="inline-start" />
                )}
                {archived ? 'Restore' : 'Archive'}
              </Button>
            </form>
            <ConfirmActionButton
              action={deleteHabitAction}
              fields={{ id: habit.id }}
              title={`Delete “${habit.name}”?`}
              description="The habit and its plan disappear from every view. Check-in history is kept for records."
              variant="ghost"
              trigger={
                <>
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </>
              }
            />
          </>
        }
      />
      {habit.why && (
        <p
          className="text-muted-foreground -mt-3 mb-6 max-w-2xl text-base italic"
          data-slot="habit-why"
        >
          “{habit.why}”
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">What to do next</h3>
            <Card>
              <CardContent className="flex flex-col gap-4">
                {next ? (
                  <p className="font-heading text-lg leading-snug" data-slot="next-up">
                    {next}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm" data-slot="next-up">
                    Nothing queued. The first item you add below becomes the answer to “where do I
                    start?”.
                  </p>
                )}
                <HabitPlan habitId={habit.id} items={items} todayKey={todayKey} />
              </CardContent>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">How it goes</h3>
            <Card>
              <CardContent>
                {habit.details ? (
                  <p className="text-sm whitespace-pre-line" data-slot="habit-details">
                    {habit.details}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nothing written yet. Use Edit to spell out where to start, what counts as done,
                    and what a good session looks like, so the habit never depends on remembering.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">Linked to</h3>
            <Card size="sm">
              <CardContent className="flex flex-col gap-2 text-sm">
                {habit.link ? (
                  <>
                    <p className="text-muted-foreground text-xs">{habit.link.label}</p>
                    <Link
                      href={habit.link.href}
                      className="link inline-flex items-center gap-1 font-medium"
                    >
                      {habit.link.title}
                      <ExternalLinkIcon className="size-3" aria-hidden />
                    </Link>
                    {habit.link.next && <p className="text-muted-foreground">{habit.link.next}</p>}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Not linked. Edit the habit to tie it to a course, subject, Bible study, reading
                    plan, routine or goal; its next lesson, reading or progress then shows here.
                  </p>
                )}
                {habit.routineNames.length > 0 && (
                  <p className="text-muted-foreground border-t pt-2 text-xs">
                    A step in {habit.routineNames.join(', ')}: completing that step checks this
                    habit in.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">Record</h3>
            <Card size="sm">
              <CardContent className="flex flex-col gap-3">
                <HabitRates habit={habit} />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <SegmentBadge name={habit.segment.name} accent={habitAccent(habit)} />
                  <StreakBadge habit={habit} />
                </div>
                {missed && (
                  <p className="text-muted-foreground text-xs" data-slot="miss-note">
                    A miss is a day, not a verdict. {daysCheckedIn(habit.checkInDates, todayKey)} of
                    the last 30 days.
                  </p>
                )}
                <ProgressBar
                  value={period.target ? Math.round((period.count / period.target) * 100) : 0}
                  label={`This ${PERIOD_NOUN[habit.frequency]}`}
                  valueText={`${period.count} of ${period.target}`}
                />
                {!archived && (
                  <div
                    className="flex items-center gap-1"
                    aria-label={`This week for ${habit.name}`}
                  >
                    {weekKeys.map((key) => {
                      const day = parseISO(key);
                      const future = isFutureKey(key, todayKey);
                      const done = checkIns.has(key);
                      return (
                        <div key={key} className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              'text-[10px] uppercase',
                              key === todayKey
                                ? 'text-primary font-medium'
                                : 'text-muted-foreground'
                            )}
                          >
                            {format(day, 'EEEEE')}
                          </span>
                          <HabitToggle
                            key={`${habit.id}:${key}:${done}`}
                            variant="cell"
                            habitId={habit.id}
                            dateKey={key}
                            done={done}
                            disabled={future}
                            label={`${habit.name} on ${format(day, 'EEEE d MMMM')}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                <Link
                  href={buildHabitsHref({ habit: habit.id })}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'xs' }), 'self-start')}
                >
                  <CalendarDaysIcon data-icon="inline-start" />
                  Month calendar
                </Link>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
