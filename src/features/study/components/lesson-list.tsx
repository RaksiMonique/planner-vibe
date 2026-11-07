'use client';

import { useActionState, useOptimistic, useTransition } from 'react';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { cn } from '@/lib/utils';
import {
  addLessonAction,
  deleteLessonAction,
  moveLessonAction,
  setLessonDoneAction,
} from '../actions';
import type { Lesson } from '../queries';

export function LessonList({ courseId, lessons }: { courseId: string; lessons: Lesson[] }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    lessons,
    (current, update: { id: string; done: boolean }) =>
      current.map((l) =>
        l.id === update.id ? { ...l, completedAt: update.done ? new Date() : null } : l
      )
  );
  const [state, formAction] = useActionState(addLessonAction, null);

  function toggle(id: string, done: boolean) {
    startTransition(async () => {
      setOptimistic({ id, done });
      await setLessonDoneAction(id, done);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {optimistic.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No lessons yet. Add the units or chapters and tick them off as you go.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {optimistic.map((lesson, i) => {
            const done = lesson.completedAt !== null;
            return (
              <li key={lesson.id} className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm">
                <Checkbox
                  checked={done}
                  onCheckedChange={(checked) => toggle(lesson.id, checked === true)}
                  aria-label={`${done ? 'Reopen' : 'Complete'} lesson ${lesson.title}`}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    done && 'text-muted-foreground line-through'
                  )}
                >
                  {i + 1}. {lesson.title}
                </span>
                {lesson.durationMinutes && (
                  <span className="text-muted-foreground text-xs">
                    {lesson.durationMinutes} min
                  </span>
                )}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Move lesson up"
                  disabled={pending || i === 0}
                  onClick={() =>
                    startTransition(() => moveLessonAction(lesson.id, 'up').then(() => {}))
                  }
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Move lesson down"
                  disabled={pending || i === optimistic.length - 1}
                  onClick={() =>
                    startTransition(() => moveLessonAction(lesson.id, 'down').then(() => {}))
                  }
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Remove lesson ${lesson.title}`}
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => deleteLessonAction(lesson.id).then(() => {}))
                  }
                >
                  <Trash2Icon />
                </Button>
              </li>
            );
          })}
        </ol>
      )}
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="courseId" value={courseId} />
        <div className="min-w-0 flex-1">
          <Input
            name="title"
            placeholder="Add a lesson"
            aria-label="Lesson title"
            required
            maxLength={200}
          />
        </div>
        <Input
          name="durationMinutes"
          type="number"
          min={1}
          max={600}
          placeholder="min"
          aria-label="Lesson minutes"
          className="w-20"
        />
        <SubmitButton size="sm" variant="outline" pendingLabel="Adding…">
          <PlusIcon data-icon="inline-start" />
          Add lesson
        </SubmitButton>
      </form>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </div>
  );
}
