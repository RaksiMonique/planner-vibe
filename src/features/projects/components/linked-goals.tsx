import Link from 'next/link';
import { Link2Icon, Unlink2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GoalOption, GoalRow } from '@/features/goals/queries';
import { HORIZON_LABELS } from '@/features/goals/schema';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import type { SegmentRef } from '@/features/life-segments/types';
import { linkGoalAction, unlinkGoalAction } from '../actions';
import { NewLinkedGoal } from './new-linked-goal';

/**
 * The goals one project supports: link an existing goal, unlink one, or
 * create a new goal that is linked to this project as soon as it is saved.
 */
export function LinkedGoals({
  projectId,
  lifeSegmentId,
  linked,
  options,
  segments,
}: {
  projectId: string;
  lifeSegmentId: string;
  linked: GoalRow[];
  options: GoalOption[];
  segments: SegmentRef[];
}) {
  const available = options.filter((o) => !linked.some((l) => l.id === o.id));
  return (
    <div className="flex flex-col gap-3">
      {linked.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          This project is not linked to a goal yet. Link one below or start a new one.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {linked.map((g) => (
            <li key={g.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm">
              <Link href={`/goals/${g.id}`} className="min-w-0 flex-1 truncate hover:underline">
                {g.title}
              </Link>
              <span className="text-muted-foreground text-xs">{HORIZON_LABELS[g.horizon]}</span>
              <form action={unlinkGoalAction}>
                <input type="hidden" name="goalId" value={g.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Unlink ${g.title}`}
                >
                  <Unlink2Icon />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        {available.length > 0 ? (
          <form action={linkGoalAction} className="flex min-w-0 flex-1 items-end gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="min-w-0 flex-1">
              <ChoiceSelect
                name="goalId"
                placeholder="Link a goal"
                options={available.map((o) => ({
                  value: o.id,
                  label: `${o.title} · ${HORIZON_LABELS[o.horizon]}`,
                }))}
                required
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              <Link2Icon data-icon="inline-start" />
              Link
            </Button>
          </form>
        ) : (
          <p className="text-muted-foreground min-w-0 flex-1 text-sm">
            {options.length === 0
              ? 'There are no open goals to link yet.'
              : 'Every open goal is linked already.'}
          </p>
        )}
        <NewLinkedGoal
          projectId={projectId}
          lifeSegmentId={lifeSegmentId}
          segments={segments}
          goalOptions={options}
        />
      </div>
    </div>
  );
}
