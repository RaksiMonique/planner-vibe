import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/shared/progress-bar';
import { SegmentDot } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import type { SegmentRef } from '@/features/life-segments/types';
import { cn } from '@/lib/utils';
import { deleteHabitAction, setHabitArchivedAction } from '../actions';
import type { HabitLinkOption } from '../links';
import type { HabitOverview } from '../queries';
import { FREQUENCY_LABELS, PERIOD_NOUN } from '../schema';
import { isFutureKey } from '../streaks';
import { HabitFormDialog } from './habit-form-dialog';
import { HabitToggle } from './habit-toggle';
import { NextUp } from './next-up';

export const habitAccent = (h: HabitOverview) => h.accent ?? h.segment.accent;

export function streakLabel(h: HabitOverview): string {
  const n = h.stats.currentStreak;
  const noun = PERIOD_NOUN[h.frequency];
  if (n === 0) return `No ${noun} streak yet`;
  return `${n} ${noun}${n === 1 ? '' : 's'} in a row`;
}

/** The short status beside a habit in a list: the 30-day rate for daily habits, else this period's count. */
export function shortStatus(h: HabitOverview): string {
  if (h.frequency === 'daily') return `${h.stats.rate30}% of 30 days`;
  return `${h.stats.period.count}/${h.stats.period.target} this ${PERIOD_NOUN[h.frequency]}`;
}

/** The rates lead; the streak follows, small. A miss changes a number, not the story. */
export function HabitRates({ habit }: { habit: HabitOverview }) {
  const s = habit.stats;
  return (
    <div className="flex flex-col gap-0.5" data-slot="habit-rates">
      <p className="text-sm">
        <span className="font-medium">{s.rate30}%</span> of the last 30 days
        <span className="text-muted-foreground"> · {s.rate90}% of 90</span>
      </p>
      <p className="text-muted-foreground text-xs">
        This month {s.monthCount} · last month {s.lastMonthCount}
      </p>
    </div>
  );
}

export function StreakBadge({ habit }: { habit: HabitOverview }) {
  return (
    <Badge variant="outline" className="text-muted-foreground h-4 px-1.5 text-[10px]">
      {streakLabel(habit)} · best {habit.stats.longestStreak}
    </Badge>
  );
}

export function HabitCard({
  habit,
  weekKeys,
  todayKey,
  segments,
  links,
}: {
  habit: HabitOverview;
  /** yyyy-MM-dd for each day of the current week, in display order. */
  weekKeys: string[];
  todayKey: string;
  segments: SegmentRef[];
  links: HabitLinkOption[];
}) {
  const archived = habit.archivedAt !== null;
  const { period } = habit.stats;
  const checkIns = new Set(habit.checkInDates);

  return (
    <Card className={cn(archived && 'opacity-70')}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <SegmentDot accent={habitAccent(habit)} className="mt-1.5" />
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg leading-snug">
              <Link href={`/habits/${habit.id}`} className="hover:text-primary block truncate">
                {habit.name}
              </Link>
            </h3>
            <p className="text-muted-foreground text-xs">
              {habit.segment.name} · {FREQUENCY_LABELS[habit.frequency]}
              {habit.target > 1 && ` · ${habit.target}× per ${PERIOD_NOUN[habit.frequency]}`}
              {habit.link && ` · ${habit.link.title}`}
            </p>
            <NextUp habit={habit} todayKey={todayKey} className="mt-0.5" />
          </div>
          {!archived && (
            <HabitFormDialog
              segments={segments}
              links={links}
              habit={habit}
              variant="ghost"
              size="icon-sm"
              trigger={
                <>
                  <PencilIcon />
                  <span className="sr-only">Edit {habit.name}</span>
                </>
              }
            />
          )}
        </div>

        {!archived && (
          <>
            <HabitRates habit={habit} />
            <StreakBadge habit={habit} />
            <ProgressBar
              value={period.target ? Math.round((period.count / period.target) * 100) : 0}
              label={`This ${PERIOD_NOUN[habit.frequency]}`}
              valueText={`${period.count} of ${period.target}`}
            />
            <div className="flex items-center gap-1" aria-label={`This week for ${habit.name}`}>
              {weekKeys.map((key) => {
                const day = parseISO(key);
                const future = isFutureKey(key, todayKey);
                const done = checkIns.has(key);
                return (
                  <div key={key} className="flex flex-col items-center gap-0.5">
                    <span
                      className={cn(
                        'text-[10px] uppercase',
                        key === todayKey ? 'text-primary font-medium' : 'text-muted-foreground'
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
          </>
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          <form action={setHabitArchivedAction}>
            <input type="hidden" name="id" value={habit.id} />
            <input type="hidden" name="archived" value={archived ? 'false' : 'true'} />
            <Button type="submit" variant="outline" size="sm">
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
            description="The habit disappears from every view. Its check-in history is kept for records."
            variant="ghost"
            trigger={
              <>
                <Trash2Icon data-icon="inline-start" />
                Delete
              </>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
