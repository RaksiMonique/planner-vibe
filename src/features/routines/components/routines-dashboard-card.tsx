import Link from 'next/link';
import { RepeatIcon } from 'lucide-react';
import { SegmentDot } from '@/components/shared/segment-badge';
import { DashboardCard, EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { routineProgress } from '../grouping';
import { listRoutinesWithCompletions } from '../queries';
import { ROUTINE_KIND_LABELS } from '../schema';
import { RoutineChecklist } from './routine-checklist';

const PREVIEW = 3;

/** Today's routines with step toggles. */
export async function RoutinesDashboardCard({
  userId,
  todayKey,
}: {
  userId: string;
  todayKey: string;
}) {
  const routines = await listRoutinesWithCompletions(userId, todayKey);
  const isFinished = (r: (typeof routines)[number]) =>
    routineProgress(
      r.steps.map((s) => s.id),
      r.completion?.completedStepIds ?? []
    ).complete;
  const finished = routines.filter(isFinished).length;
  // A preview: the first few still to do, then finished ones; the page has the rest.
  const shown = [...routines]
    .sort((a, b) => Number(isFinished(a)) - Number(isFinished(b)))
    .slice(0, PREVIEW);
  const more = routines.length - shown.length;

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
            {shown.map((r) => {
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
          {more > 0 && (
            <Link href="/routines" className="text-primary text-xs hover:underline">
              {more} more on the Routines page
            </Link>
          )}
        </>
      )}
    </DashboardCard>
  );
}
