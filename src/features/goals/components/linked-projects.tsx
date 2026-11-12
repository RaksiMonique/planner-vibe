import Link from 'next/link';
import { Link2Icon, PlusIcon, Unlink2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import type { SegmentRef } from '@/features/life-segments/types';
import { ProjectFormDialog } from '@/features/projects/components/project-form-dialog';
import type { ProjectOption, ProjectRow } from '@/features/projects/queries';
import { linkProjectAction, unlinkProjectAction } from '../actions';
import type { GoalOption } from '../queries';

/**
 * The projects supporting one goal: link an existing active project, unlink
 * one, or create a new project that starts out linked to this goal.
 */
export function LinkedProjects({
  goalId,
  lifeSegmentId,
  linked,
  options,
  segments,
  goalOptions,
}: {
  goalId: string;
  lifeSegmentId: string;
  linked: ProjectRow[];
  options: ProjectOption[];
  segments: SegmentRef[];
  goalOptions: GoalOption[];
}) {
  const available = options.filter((o) => !linked.some((l) => l.id === o.id));
  return (
    <div className="flex flex-col gap-3">
      {linked.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No projects support this goal yet. Link one below or start a new one.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {linked.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm">
              <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate hover:underline">
                {p.title}
              </Link>
              <span className="text-muted-foreground text-xs tabular-nums">{p.progress}%</span>
              <form action={unlinkProjectAction}>
                <input type="hidden" name="goalId" value={goalId} />
                <input type="hidden" name="projectId" value={p.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Unlink ${p.title}`}
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
          <form action={linkProjectAction} className="flex min-w-0 flex-1 items-end gap-2">
            <input type="hidden" name="goalId" value={goalId} />
            <div className="min-w-0 flex-1">
              <ChoiceSelect
                name="projectId"
                placeholder="Link a project"
                options={available.map((o) => ({ value: o.id, label: o.title }))}
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
              ? 'There are no active projects to link yet.'
              : 'Every active project is linked already.'}
          </p>
        )}
        <ProjectFormDialog
          segments={segments}
          goalOptions={goalOptions}
          linkedGoalIds={[goalId]}
          defaults={{ lifeSegmentId }}
          variant="outline"
          trigger={
            <>
              <PlusIcon data-icon="inline-start" />
              New project
            </>
          }
        />
      </div>
    </div>
  );
}
