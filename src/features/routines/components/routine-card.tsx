import { CopyPlusIcon, PencilIcon, SaveIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import type { SegmentRef } from '@/features/life-segments/types';
import { cn } from '@/lib/utils';
import { createFromTemplateAction, deleteRoutineAction, saveAsTemplateAction } from '../actions';
import type { RoutineCompletion, RoutineRow } from '../queries';
import { DAY_LABELS, ROUTINE_KIND_LABELS } from '../schema';
import { RoutineFormDialog, type HabitOption } from './routine-form-dialog';
import { RoutineHistory } from './routine-history';

export function RoutineCard({
  routine,
  segments,
  habitOptions,
  completions,
  historyKeys,
  todayKey,
}: {
  routine: RoutineRow;
  segments: SegmentRef[];
  habitOptions: HabitOption[];
  completions: RoutineCompletion[];
  historyKeys: string[];
  todayKey: string;
}) {
  const minutes = routine.steps.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const days = new Set(routine.daysOfWeek);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <SegmentDot accent={routine.segment.accent} className="mt-1.5" />
          <div className="min-w-0 flex-1">
            <h3 className="font-heading truncate text-lg leading-snug">{routine.name}</h3>
            <p className="text-muted-foreground text-xs">
              {ROUTINE_KIND_LABELS[routine.kind]} · {routine.segment.name} · {routine.steps.length}{' '}
              step{routine.steps.length === 1 ? '' : 's'}
              {minutes > 0 && ` · ${minutes} min`}
            </p>
          </div>
          {routine.isTemplate && <Badge variant="outline">Template</Badge>}
          <RoutineFormDialog
            segments={segments}
            habitOptions={habitOptions}
            routine={routine}
            variant="ghost"
            size="icon-sm"
            trigger={
              <>
                <PencilIcon />
                <span className="sr-only">Edit {routine.name}</span>
              </>
            }
          />
        </div>

        {!routine.isTemplate && (
          <div className="flex gap-1" aria-label="Scheduled days">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <span
                key={d}
                className={cn(
                  'rounded-full border px-1.5 py-0.5 text-[10px] uppercase',
                  days.has(d)
                    ? 'border-primary bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground/70 border-transparent'
                )}
              >
                {DAY_LABELS[d]}
              </span>
            ))}
          </div>
        )}

        <ol className="text-muted-foreground list-inside list-decimal text-xs">
          {routine.steps.slice(0, 5).map((s) => (
            <li key={s.id} className="truncate">
              {s.title}
            </li>
          ))}
          {routine.steps.length > 5 && <li>and {routine.steps.length - 5} more</li>}
        </ol>

        {!routine.isTemplate && (
          <RoutineHistory
            dayKeys={historyKeys}
            daysOfWeek={routine.daysOfWeek}
            completions={completions}
            todayKey={todayKey}
          />
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          {routine.isTemplate ? (
            <form action={createFromTemplateAction}>
              <input type="hidden" name="id" value={routine.id} />
              <Button type="submit" variant="outline" size="sm">
                <CopyPlusIcon data-icon="inline-start" />
                Use template
              </Button>
            </form>
          ) : (
            <form action={saveAsTemplateAction}>
              <input type="hidden" name="id" value={routine.id} />
              <Button type="submit" variant="outline" size="sm">
                <SaveIcon data-icon="inline-start" />
                Save as template
              </Button>
            </form>
          )}
          <ConfirmActionButton
            action={deleteRoutineAction}
            fields={{ id: routine.id }}
            title={`Delete “${routine.name}”?`}
            description="The routine disappears from every view. Past completions are kept for records."
            variant="ghost"
            trigger={
              <>
                <Trash2Icon data-icon="inline-start" />
                Delete
              </>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
