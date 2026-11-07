import Link from 'next/link';
import { Link2Icon, Unlink2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import type { ProjectOption, ProjectRow } from '@/features/projects/queries';
import { linkProjectAction, unlinkProjectAction } from '../actions';

export function LinkedProjects({
  goalId,
  linked,
  options,
}: {
  goalId: string;
  linked: ProjectRow[];
  options: ProjectOption[];
}) {
  const available = options.filter((o) => !linked.some((l) => l.id === o.id));
  return (
    <div className="flex flex-col gap-3">
      {linked.length === 0 ? (
        <p className="text-muted-foreground text-sm">No projects support this goal yet.</p>
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
      {available.length > 0 && (
        <form action={linkProjectAction} className="flex items-end gap-2">
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
      )}
    </div>
  );
}
