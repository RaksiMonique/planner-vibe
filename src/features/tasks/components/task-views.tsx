import Link from 'next/link';
import { dueStatus, type WeekStartsOn } from '@/lib/dates';
import { EmptyState } from '@/components/shared/empty-state';
import { ListChecksIcon } from 'lucide-react';
import {
  BOARD_COLUMNS,
  groupForBoard,
  groupForList,
  groupForMatrix,
  LIST_GROUPS,
  QUADRANTS,
} from '../grouping';
import type { TaskRow as TaskRowData } from '../queries';
import { BoardMove } from './board-move';
import { TaskRow } from './task-row';

export type ViewProps = {
  tasks: TaskRowData[];
  today: Date;
  weekStartsOn: WeekStartsOn;
  subtaskCounts: Record<string, number>;
  /** Subtasks keyed by parent id, shown indented under the parent. */
  subtasksOf: Record<string, TaskRowData[]>;
  /** Builds the edit link for a task, keeping the page's current params. */
  editHref: (id: string) => string;
};

/** The subtasks of one parent, indented beneath it so they read as part of it. */
function Subtasks({
  items,
  today,
  weekStartsOn,
  editHref,
}: {
  items: TaskRowData[] | undefined;
  today: Date;
  weekStartsOn: WeekStartsOn;
  editHref: (id: string) => string;
}) {
  if (!items?.length) return null;
  return (
    <ul data-slot="subtasks" className="border-input ml-5 flex flex-col border-l pl-1.5">
      {items.map((s) => (
        <li key={s.id}>
          <TaskRow
            task={s}
            status={dueStatus(s.dueDate, today, weekStartsOn)}
            editHref={editHref(s.id)}
            compact
          />
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  return (
    <EmptyState
      icon={ListChecksIcon}
      title="No tasks here"
      description="Add one with New task, or file something from the Inbox."
    />
  );
}

export function TaskListView({
  tasks,
  today,
  weekStartsOn,
  subtaskCounts,
  subtasksOf,
  editHref,
}: ViewProps) {
  if (tasks.length === 0) return <Empty />;
  const groups = groupForList(tasks, today, weekStartsOn);
  return (
    <div className="flex flex-col gap-6">
      {LIST_GROUPS.filter((g) => groups[g.key].length > 0).map((g) => (
        <section key={g.key} className="flex flex-col gap-1">
          <h3 className="tracking-eyebrow text-muted-foreground flex items-center justify-between px-1.5 text-xs uppercase">
            {g.label}
            <span className="tabular-nums">{groups[g.key].length}</span>
          </h3>
          <ul className="flex flex-col">
            {groups[g.key].map((t) => (
              <li key={t.id}>
                <TaskRow
                  task={t}
                  status={g.key}
                  editHref={editHref(t.id)}
                  subtaskCount={subtaskCounts[t.id]}
                />
                <Subtasks
                  items={subtasksOf[t.id]}
                  today={today}
                  weekStartsOn={weekStartsOn}
                  editHref={editHref}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function TaskBoardView({
  tasks,
  today,
  weekStartsOn,
  subtaskCounts,
  subtasksOf,
  editHref,
}: ViewProps) {
  if (tasks.length === 0) return <Empty />;
  const groups = groupForBoard(tasks);
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {BOARD_COLUMNS.map((col) => (
        <section
          key={col.key}
          className="bg-card/60 flex min-w-0 flex-col gap-2 rounded-xl border p-2"
        >
          <h3 className="tracking-eyebrow text-muted-foreground flex items-center justify-between px-1.5 text-xs uppercase">
            {col.label}
            <span className="tabular-nums">{groups[col.key].length}</span>
          </h3>
          <ul className="flex flex-col gap-1">
            {groups[col.key].map((t) => (
              <li key={t.id} className="bg-card ring-foreground/10 min-w-0 rounded-lg ring-1">
                <TaskRow
                  task={t}
                  status={dueStatus(t.dueDate, today, weekStartsOn)}
                  editHref={editHref(t.id)}
                  subtaskCount={subtaskCounts[t.id]}
                  compact
                />
                <Subtasks
                  items={subtasksOf[t.id]}
                  today={today}
                  weekStartsOn={weekStartsOn}
                  editHref={editHref}
                />
                <div className="px-2 pb-1.5">
                  <BoardMove id={t.id} status={col.key} blockedBy={t.blockedBy} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function TaskMatrixView({
  tasks,
  today,
  weekStartsOn,
  subtaskCounts,
  subtasksOf,
  editHref,
}: ViewProps) {
  if (tasks.length === 0) return <Empty />;
  const groups = groupForMatrix(tasks, today, weekStartsOn);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {QUADRANTS.map((q) => (
        <section
          key={q.key}
          className="bg-card/60 flex min-h-40 min-w-0 flex-col gap-2 rounded-xl border p-2"
        >
          <h3 className="px-1.5">
            <span className="tracking-eyebrow text-muted-foreground block text-xs uppercase">
              {q.label}
            </span>
            <span className="text-muted-foreground text-xs">{q.hint}</span>
          </h3>
          <ul className="flex flex-col">
            {groups[q.key].map((t) => (
              <li key={t.id}>
                <TaskRow
                  task={t}
                  status={dueStatus(t.dueDate, today, weekStartsOn)}
                  editHref={editHref(t.id)}
                  subtaskCount={subtaskCounts[t.id]}
                  compact
                />
                <Subtasks
                  items={subtasksOf[t.id]}
                  today={today}
                  weekStartsOn={weekStartsOn}
                  editHref={editHref}
                />
              </li>
            ))}
            {groups[q.key].length === 0 && (
              <li className="text-muted-foreground px-1.5 py-2 text-xs">Nothing here.</li>
            )}
          </ul>
        </section>
      ))}
      <p className="text-muted-foreground text-xs md:col-span-2">
        Due today or overdue counts as due now. Tick Important on a task to move it up; give an
        undated task a date and it finds its box.{' '}
        <Link href="?view=list" className="underline">
          Back to the list
        </Link>
        .
      </p>
    </div>
  );
}
