import type { Metadata } from 'next';
import { subDays } from 'date-fns';
import { PlusIcon, RepeatIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentDot } from '@/components/shared/segment-badge';
import { listHabits } from '@/features/habits/queries';
import { listSegments } from '@/features/life-segments/service';
import { RoutineCard } from '@/features/routines/components/routine-card';
import { RoutineChecklist } from '@/features/routines/components/routine-checklist';
import { RoutineFormDialog } from '@/features/routines/components/routine-form-dialog';
import { groupRoutinesByKind } from '@/features/routines/grouping';
import {
  listCompletionsBetween,
  listRoutines,
  listRoutinesWithCompletions,
} from '@/features/routines/queries';
import { ROUTINE_KIND_LABELS } from '@/features/routines/schema';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';

export const metadata: Metadata = { title: 'Routines' };
export const dynamic = 'force-dynamic';

const HISTORY_DAYS = 14;

export default async function RoutinesPage() {
  const user = await requireUser();
  const [segments, prefs, habits] = await Promise.all([
    listSegments(user.id),
    getPreferences(user.id),
    listHabits(user.id),
  ]);
  const today = todayInZone(prefs.timeZone);
  const todayKey = toDateKey(today);
  const historyKeys = Array.from({ length: HISTORY_DAYS }, (_, i) =>
    toDateKey(subDays(today, HISTORY_DAYS - 1 - i))
  );
  const [all, todays, completions] = await Promise.all([
    listRoutines(user.id, { includeTemplates: true }),
    listRoutinesWithCompletions(user.id, todayKey),
    listCompletionsBetween(user.id, historyKeys[0], todayKey),
  ]);
  const habitOptions = habits.map((h) => ({ id: h.id, name: h.name }));
  const live = all.filter((r) => !r.isTemplate);
  const templates = all.filter((r) => r.isTemplate);
  const todayGroups = groupRoutinesByKind(todays);

  const newDialog = (
    <RoutineFormDialog
      segments={segments}
      habitOptions={habitOptions}
      trigger={
        <>
          <PlusIcon data-icon="inline-start" />
          New routine
        </>
      }
    />
  );

  return (
    <>
      <PageHeader
        eyebrow="Planning"
        title="Routines"
        description="Morning, evening and custom sequences, scheduled by weekday and ticked off step by step."
        actions={newDialog}
      />

      {live.length === 0 && templates.length === 0 ? (
        <EmptyState
          icon={RepeatIcon}
          title="No routines yet"
          description="Start with a morning routine: three or four steps you already do, in order."
          action={newDialog}
        />
      ) : (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">Today</h3>
            {todays.length === 0 ? (
              <p className="text-muted-foreground text-sm">No routine is scheduled for today.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {todayGroups.map((group) => (
                  <div key={group.kind} className="flex flex-col gap-3">
                    <p className="tracking-eyebrow text-muted-foreground text-xs uppercase">
                      {ROUTINE_KIND_LABELS[group.kind]}
                    </p>
                    {group.routines.map((r) => {
                      const completedIds = r.completion?.completedStepIds ?? [];
                      return (
                        <Card key={r.id}>
                          <CardContent className="flex flex-col gap-2">
                            <p className="flex items-center gap-2 font-medium">
                              <SegmentDot accent={r.segment.accent} />
                              {r.name}
                            </p>
                            <RoutineChecklist
                              key={`${r.id}:${todayKey}:${completedIds.join(',')}`}
                              routineId={r.id}
                              routineName={r.name}
                              dateKey={todayKey}
                              steps={r.steps}
                              completedStepIds={completedIds}
                            />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-xl">All routines</h3>
            {live.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Only templates so far. Use one to create a live routine.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {live.map((r) => (
                  <RoutineCard
                    key={r.id}
                    routine={r}
                    segments={segments}
                    habitOptions={habitOptions}
                    completions={completions.filter((c) => c.routineId === r.id)}
                    historyKeys={historyKeys}
                    todayKey={todayKey}
                  />
                ))}
              </div>
            )}
          </section>

          {templates.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="font-heading text-xl">Templates</h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {templates.map((r) => (
                  <RoutineCard
                    key={r.id}
                    routine={r}
                    segments={segments}
                    habitOptions={habitOptions}
                    completions={[]}
                    historyKeys={historyKeys}
                    todayKey={todayKey}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
