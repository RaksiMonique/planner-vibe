import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import type { SegmentRef } from '@/features/life-segments/types';
import { getPreferences } from '@/features/settings/service';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { linkValue, type HabitLinkKind } from '../links';
import { getHabitOverview, listHabitLinkOptions } from '../queries';
import { habitAccent, shortStatus } from './habit-card';
import { HabitFormDialog } from './habit-form-dialog';
import { HabitToggle } from './habit-toggle';
import { SlippedWhy } from './habit-why';
import { NextUp } from './next-up';

/**
 * The habits that serve one thing (a course, a Bible study) or one kind of
 * thing (every study habit), with today's check-in and what comes next. Shown
 * on the pages of the things habits link to, so the plan is visible from both
 * sides (instructions.md 8.2).
 */
export async function LinkedHabits({
  userId,
  segments,
  match,
  defaultSegmentId,
  title = 'Habits',
  emptyText,
}: {
  userId: string;
  segments: SegmentRef[];
  match: { kind: HabitLinkKind; id: string } | { kinds: HabitLinkKind[] };
  defaultSegmentId?: string;
  title?: string;
  emptyText: string;
}) {
  const prefs = await getPreferences(userId);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const [all, links] = await Promise.all([
    getHabitOverview(userId, todayKey, prefs.weekStartsOn),
    listHabitLinkOptions(userId),
  ]);
  const habits = all.filter(
    (h) =>
      h.link &&
      ('id' in match
        ? h.link.kind === match.kind && h.link.id === match.id
        : match.kinds.includes(h.link.kind))
  );

  return (
    <section className="flex flex-col gap-3" data-slot="linked-habits">
      <div className="flex items-center gap-2">
        <h3 className="font-heading text-xl">{title}</h3>
        {'id' in match && (
          <span className="ml-auto">
            <HabitFormDialog
              segments={segments}
              links={links}
              defaultSegmentId={defaultSegmentId}
              defaultLink={linkValue(match.kind, match.id)}
              variant="outline"
              size="xs"
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  Habit
                </>
              }
            />
          </span>
        )}
      </div>
      <Card size="sm">
        <CardContent>
          {habits.length === 0 ? (
            <p className="text-muted-foreground text-sm">{emptyText}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {habits.map((h) => (
                <li key={h.id} className="flex items-start gap-2.5 text-sm">
                  <HabitToggle
                    key={`${h.id}:${todayKey}:${h.doneToday}`}
                    habitId={h.id}
                    dateKey={todayKey}
                    done={h.doneToday}
                    label={
                      h.doneToday ? `Remove today's check-in for ${h.name}` : `Check in ${h.name}`
                    }
                    className="mt-0.5"
                  />
                  <SegmentDot accent={habitAccent(h)} className="mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <Link
                        href={`/habits/${h.id}`}
                        className={cn(
                          'link min-w-0 truncate font-medium',
                          h.doneToday && 'text-muted-foreground line-through'
                        )}
                      >
                        {h.name}
                      </Link>
                      <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                        {'kinds' in match && h.link ? `${h.link.title} · ` : ''}
                        {shortStatus(h)}
                      </span>
                    </div>
                    <NextUp habit={h} todayKey={todayKey} />
                    <SlippedWhy habit={h} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
