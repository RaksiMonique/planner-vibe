import { format, parseISO } from 'date-fns';
import { PauseIcon, PencilIcon, PlayIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { EmptyNote } from '@/features/dashboard/components/dashboard-card';
import { cn } from '@/lib/utils';
import { deletePatternAction, setPatternActiveAction } from '../actions';
import { describeCycle } from '../availability';
import type { ShiftPattern } from '../queries';
import { PatternFormDialog } from './pattern-form-dialog';

export function PatternsPanel({
  patterns,
  todayKey,
}: {
  patterns: ShiftPattern[];
  todayKey: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="items-center">
        <h3 className="font-heading text-lg">Shift patterns</h3>
        <CardAction>
          <PatternFormDialog
            defaultAnchorDate={todayKey}
            variant="outline"
            size="xs"
            trigger={
              <>
                <PlusIcon data-icon="inline-start" />
                New pattern
              </>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <EmptyNote>
            No patterns yet. A pattern is a repeating cycle such as two days on, two days off.
          </EmptyNote>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {patterns.map((p) => (
              <li
                key={p.id}
                className={cn(
                  'bg-card flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2.5 py-2',
                  !p.isActive && 'opacity-70'
                )}
              >
                <SegmentDot accent={p.accent} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm">
                    {p.name}
                    {!p.isActive && <Badge variant="outline">Paused</Badge>}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {describeCycle(p.cycle)} · from {format(parseISO(p.anchorDate), 'd MMM yyyy')}
                  </p>
                </div>
                <span className="flex items-center">
                  <form action={setPatternActiveAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="isActive" value={p.isActive ? '0' : '1'} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={p.isActive ? `Pause ${p.name}` : `Resume ${p.name}`}
                    >
                      {p.isActive ? <PauseIcon /> : <PlayIcon />}
                    </Button>
                  </form>
                  <PatternFormDialog
                    pattern={p}
                    defaultAnchorDate={todayKey}
                    variant="ghost"
                    size="icon-xs"
                    trigger={
                      <>
                        <PencilIcon />
                        <span className="sr-only">Edit {p.name}</span>
                      </>
                    }
                  />
                  <ConfirmActionButton
                    action={deletePatternAction}
                    fields={{ id: p.id }}
                    title={`Delete "${p.name}"?`}
                    description="Its days disappear from the calendar. Shifts you added by hand stay."
                    variant="ghost"
                    size="icon-xs"
                    trigger={
                      <>
                        <Trash2Icon />
                        <span className="sr-only">Delete {p.name}</span>
                      </>
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
