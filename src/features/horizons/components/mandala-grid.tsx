import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/shared/progress-bar';
import { GoalFormDialog } from '@/features/goals/components/goal-form-dialog';
import { HORIZON_ORDER } from '@/features/goals/progress';
import type { GoalOption, GoalRow } from '@/features/goals/queries';
import { HORIZON_LABELS } from '@/features/goals/schema';
import type { SegmentRef } from '@/features/life-segments/types';
import type { ProjectOption } from '@/features/projects/queries';
import { buildMandala } from '../mandala';

/** A goal in the middle, up to eight supporting goals around it; each opens its own grid. */
export function MandalaGrid({
  center,
  supporting,
  segments,
  goalOptions,
  projectOptions,
}: {
  center: GoalRow;
  supporting: GoalRow[];
  segments: SegmentRef[];
  goalOptions: GoalOption[];
  projectOptions: ProjectOption[];
}) {
  const { cells, overflow } = buildMandala(center, supporting);
  const nextHorizon = HORIZON_ORDER[HORIZON_ORDER.indexOf(center.horizon) + 1];
  const cellClass = 'flex min-h-28 flex-col justify-between gap-1.5 rounded-xl p-3 sm:min-h-36';

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Mandala">
        {cells.map((cell) => (
          <li key={cell.position} className="min-w-0">
            {cell.isCenter ? (
              <div
                className={`${cellClass} bg-secondary text-secondary-foreground justify-center text-center`}
              >
                <Badge variant="outline" className="self-center">
                  {HORIZON_LABELS[center.horizon]}
                </Badge>
                <p className="font-heading text-base leading-snug sm:text-lg">{center.title}</p>
                <ProgressBar
                  value={center.progress}
                  valueText={`${center.progress}%`}
                  valueClassName="text-xs"
                />
                <Link
                  href={`/goals/${center.id}`}
                  className="text-xs underline-offset-4 hover:underline"
                >
                  Open goal
                </Link>
              </div>
            ) : cell.goal ? (
              <Link
                href={`/goals/${cell.goal.id}/mandala`}
                className={`${cellClass} bg-card hover:bg-muted/40 border transition-colors`}
              >
                <Badge variant="outline" className="self-start">
                  {HORIZON_LABELS[cell.goal.horizon]}
                </Badge>
                <span className="line-clamp-3 text-sm leading-snug font-medium">
                  {cell.goal.title}
                </span>
                <ProgressBar
                  value={cell.goal.progress}
                  valueText={`${cell.goal.progress}%`}
                  valueClassName="text-xs"
                />
              </Link>
            ) : (
              <div
                className={`${cellClass} border-border/70 text-muted-foreground items-center justify-center border border-dashed text-xs`}
              >
                {nextHorizon ? (
                  <GoalFormDialog
                    segments={segments}
                    goalOptions={goalOptions}
                    projectOptions={projectOptions}
                    defaults={{
                      parentGoalId: center.id,
                      lifeSegmentId: center.lifeSegmentId,
                      horizon: nextHorizon,
                    }}
                    variant="ghost"
                    trigger={
                      <>
                        <PlusIcon data-icon="inline-start" />
                        Add sub-goal
                      </>
                    }
                  />
                ) : (
                  <span className="text-center">Weekly goals break down into tasks</span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {overflow.length > 0 && (
        <p className="text-muted-foreground mt-3 text-sm">
          Also part of this goal:{' '}
          {overflow.map((g, i) => (
            <span key={g.id}>
              {i > 0 && ', '}
              <Link href={`/goals/${g.id}/mandala`} className="underline-offset-4 hover:underline">
                {g.title}
              </Link>
            </span>
          ))}
        </p>
      )}
    </>
  );
}
