import Link from 'next/link';
import { RepeatIcon } from 'lucide-react';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { routineProgress } from '../grouping';
import { listRoutinesWithCompletions } from '../queries';
import { ROUTINE_KIND_LABELS } from '../schema';
import { RoutineChecklist } from './routine-checklist';

/** Today's routines with step toggles. */
export async function RoutinesDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const routines = await listRoutinesWithCompletions(userId, todayKey);
  const finished = routines.filter(
    (r) =>
      routineProgress(
        r.steps.map((s) => s.id),
        r.completion?.completedStepIds ?? []
      ).complete
  ).length;

  return (
    <DashboardCard title="Routines" icon={RepeatIcon} href="/routines" release={2}>
      {routines.length === 0 ? (
        <EmptyNote>
          Nothing scheduled today.{' '}
          <Link href="/routines" className="text-primary hover:underline">
            Set up a routine.
          </Link>
        </EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {finished} of {routines.length} finished today.
          </p>
          <div className="flex flex-col gap-3">
            {routines.map((r) => {
              const completedIds = r.completion?.completedStepIds ?? [];
              return (
                <div key={r.id} className="flex flex-col gap-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <SegmentDot accent={r.segment.accent} />
                    {r.name}
                    <span className="text-muted-foreground text-xs font-normal">
                      {ROUTINE_KIND_LABELS[r.kind]}
                    </span>
                  </p>
                  <RoutineChecklist
                    key={`${r.id}:${todayKey}:${completedIds.join(',')}`}
                    routineId={r.id}
                    routineName={r.name}
                    dateKey={todayKey}
                    steps={r.steps}
                    completedStepIds={completedIds}
                    compact
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardCard>
  );
}
