import Link from 'next/link';
import { ChartNoAxesColumnIcon } from 'lucide-react';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { getPreferences } from '@/features/settings/service';
import { buildTimeRange, rangeFor } from '@/features/time/service';
import type { WeekStartsOn } from '@/lib/dates';
import {
  countHabitCheckInsBetween,
  countJournalEntriesBetween,
  countTasksCompletedBetween,
} from '../queries';
import { deltaLabel, formatHours, weekKeys, weekLabel } from '../week-stats';

type Tile = { key: string; value: string; label: string; hint?: string };

/** One stat tile per module that is switched on, for the current week, with last week beside it. */
export async function WeekStatsDashboardCard({
  userId,
  todayKey,
  timeZone,
  weekStartsOn,
}: {
  userId: string;
  todayKey: string;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}) {
  const prefs = await getPreferences(userId);
  const on = (module: keyof typeof prefs.enabledModules) => prefs.enabledModules[module] !== false;
  const { current, previous } = weekKeys(todayKey, weekStartsOn);
  const thisWeek = rangeFor('week', todayKey, timeZone, weekStartsOn);
  const lastWeek = rangeFor('week', previous.start, timeZone, weekStartsOn);

  const [tasks, tasksBefore, habits, habitsBefore, time, journal, journalBefore] =
    await Promise.all([
      on('planning') ? countTasksCompletedBetween(userId, thisWeek.from, thisWeek.to) : null,
      on('planning') ? countTasksCompletedBetween(userId, lastWeek.from, lastWeek.to) : null,
      on('habits') ? countHabitCheckInsBetween(userId, current.start, current.end) : null,
      on('habits') ? countHabitCheckInsBetween(userId, previous.start, previous.end) : null,
      on('time') ? buildTimeRange(userId, thisWeek.from, thisWeek.to, timeZone) : null,
      on('journal') ? countJournalEntriesBetween(userId, current.start, current.end) : null,
      on('journal') ? countJournalEntriesBetween(userId, previous.start, previous.end) : null,
    ]);

  const tiles: Tile[] = [];
  if (tasks !== null && tasksBefore !== null) {
    tiles.push({
      key: 'tasks',
      value: String(tasks),
      label: tasks === 1 ? 'task completed' : 'tasks completed',
      hint: deltaLabel(tasks, tasksBefore),
    });
  }
  if (habits !== null && habitsBefore !== null) {
    tiles.push({
      key: 'habits',
      value: String(habits),
      label: habits === 1 ? 'habit check-in' : 'habit check-ins',
      hint: deltaLabel(habits, habitsBefore),
    });
  }
  if (time) {
    tiles.push({
      key: 'time',
      value: formatHours(time.analysis.plannedTotal),
      label: 'hours blocked',
      hint: `${formatHours(time.analysis.actualTotal)} logged`,
    });
  }
  if (journal !== null && journalBefore !== null) {
    tiles.push({
      key: 'journal',
      value: String(journal),
      label: journal === 1 ? 'journal entry' : 'journal entries',
      hint: deltaLabel(journal, journalBefore),
    });
  }

  return (
    <DashboardCard
      title="This week in numbers"
      icon={ChartNoAxesColumnIcon}
      href="/analytics"
      release={6}
    >
      {tiles.length === 0 ? (
        <EmptyNote>
          Nothing to count yet.{' '}
          <Link href="/settings" className="text-primary link">
            Switch on tasks, habits, time or journal.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">{weekLabel(current)}</p>
          <ul className="grid grid-cols-2 gap-3">
            {tiles.map((t) => (
              <li key={t.key} className="flex flex-col rounded-lg border px-3 py-2">
                <span className="font-heading text-2xl leading-tight tabular-nums">{t.value}</span>
                <span className="text-sm">{t.label}</span>
                {t.hint && <span className="text-muted-foreground text-xs">{t.hint}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardCard>
  );
}
