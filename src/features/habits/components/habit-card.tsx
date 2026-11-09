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
import type { HabitOverview } from '../queries';
import { FREQUENCY_LABELS, PERIOD_NOUN } from '../schema';
import { isFutureKey } from '../streaks';
import { HabitFormDialog } from './habit-form-dialog';
import { HabitToggle } from './habit-toggle';

export const habitAccent = (h: HabitOverview) => h.accent ?? h.segment.accent;

export function streakLabel(h: HabitOverview): string {
  const n = h.stats.currentStreak;
  const noun = PERIOD_NOUN[h.frequency];
  if (n === 0) return `No ${noun} streak yet`;
  return `${n} ${noun}${n === 1 ? '' : 's'} in a row`;
}

export function HabitCard({
  habit,
  weekKeys,
  todayKey,
  segments,
}: {
  habit: HabitOverview;
  /** yyyy-MM-dd for each day of the current week, in display order. */
  weekKeys: string[];
  todayKey: string;
  segments: SegmentRef[];
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
            <h3 className="font-heading truncate text-lg leading-snug">{habit.name}</h3>
            <p className="text-muted-foreground text-xs">
              {habit.segment.name} · {FREQUENCY_LABELS[habit.frequency]}
              {habit.target > 1 && ` · ${habit.target}× per ${PERIOD_NOUN[habit.frequency]}`}
            </p>
          </div>
          {!archived && (
            <HabitFormDialog
              segments={segments}
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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <Badge variant={habit.stats.currentStreak > 0 ? 'secondary' : 'outline'}>
                {streakLabel(habit)}
              </Badge>
              <span className="text-muted-foreground">
                Best {habit.stats.longestStreak} · {habit.stats.rate30}% of the last 30 days
              </span>
            </div>
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
