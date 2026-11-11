import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { CheckIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MilestoneRow } from '../queries';

export function MilestoneRows({
  milestones,
  todayKey,
  emptyText,
}: {
  milestones: MilestoneRow[];
  todayKey: string;
  emptyText: string;
}) {
  if (milestones.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col divide-y">
      {milestones.map((m) => {
        const done = m.completedAt !== null;
        const overdue = !done && m.dueDate !== null && m.dueDate < todayKey;
        const href = m.goalId
          ? `/goals/${m.goalId}`
          : m.projectId
            ? `/projects/${m.projectId}`
            : '/goals';
        return (
          <li key={m.id} className="flex items-start gap-2 py-2 text-sm">
            <span
              aria-hidden
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${done ? 'bg-sage border-sage text-white' : 'border-border'}`}
            >
              {done && <CheckIcon className="size-3" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={done ? 'text-muted-foreground line-through' : ''}>{m.title}</p>
              <p className="text-muted-foreground text-xs">
                <Link href={href} className="underline-offset-4 hover:underline">
                  {m.goalTitle ?? m.projectTitle ?? 'Milestone'}
                </Link>
              </p>
            </div>
            {m.dueDate && (
              <Badge variant={overdue ? 'destructive' : 'outline'}>
                {format(parseISO(m.dueDate), 'd MMM')}
              </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}
