import Link from 'next/link';
import { Link2Icon, Unlink2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GoalOption, GoalRow } from '@/features/goals/queries';
import { HORIZON_LABELS } from '@/features/goals/schema';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { linkGoalAction, unlinkGoalAction } from '../actions';

export function LinkedGoals({
  projectId,
  linked,
  options,
}: {
  projectId: string;
  linked: GoalRow[];
  options: GoalOption[];
}) {
  const available = options.filter((o) => !linked.some((l) => l.id === o.id));
  return (
    <div className="flex flex-col gap-3">
      {linked.length === 0 ? (
        <p className="text-muted-foreground text-sm">This project is not linked to a goal yet.</p>
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
      {available.length > 0 && (
        <form action={linkGoalAction} className="flex items-end gap-2">
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
      )}
    </div>
  );
}
