'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PlusIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { GoalOption } from '@/features/goals/queries';
import type { LifeSegment } from '@/features/life-segments/service';
import type { ProjectOption } from '@/features/projects/queries';
import { NativeSelect } from './native-select';

const VIEWS = [
  { key: 'list', label: 'List' },
  { key: 'board', label: 'Board' },
  { key: 'matrix', label: 'Matrix' },
] as const;

export function TasksToolbar({
  view,
  segments,
  projects,
  goals,
}: {
  view: string;
  segments: LifeSegment[];
  projects: ProjectOption[];
  goals: GoalOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('new');
    next.delete('task');
    router.push(`${pathname}?${next.toString()}`);
  }

  const newParams = new URLSearchParams(params.toString());
  newParams.set('new', '1');

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="View" className="bg-card flex rounded-lg border p-0.5">
          {VIEWS.map((v) => {
            const p = new URLSearchParams(params.toString());
            p.set('view', v.key);
            p.delete('new');
            p.delete('task');
            return (
              <Link
                key={v.key}
                href={`${pathname}?${p.toString()}`}
                aria-current={view === v.key ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1 text-sm',
                  view === v.key
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href={`${pathname}?${newParams.toString()}`}
          className={cn(buttonVariants({ size: 'sm' }), 'ml-auto')}
        >
          <PlusIcon data-icon="inline-start" />
          New task
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <NativeSelect
          aria-label="Life Segment"
          value={params.get('segment') ?? ''}
          onChange={(e) => setParam('segment', e.target.value || null)}
          className="sm:w-48"
        >
          <option value="">All segments</option>
          {segments.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Project"
          value={params.get('project') ?? ''}
          onChange={(e) => setParam('project', e.target.value || null)}
          className="sm:w-48"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Goal"
          value={params.get('goal') ?? ''}
          onChange={(e) => setParam('goal', e.target.value || null)}
          className="sm:w-48"
        >
          <option value="">All goals</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={params.get('done') === '1'}
            onCheckedChange={(c) => setParam('done', c ? '1' : null)}
          />
          Show done
        </label>
      </div>
    </div>
  );
}
