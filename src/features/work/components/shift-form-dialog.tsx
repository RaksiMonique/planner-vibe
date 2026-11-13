'use client';

import { useActionState, useRef, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { moveWith } from '@/lib/dates';
import { createShiftAction, updateShiftAction } from '../actions';
import type { ShiftKindRow, ShiftRow } from '../queries';
import {
  KIND_NAME_MAX,
  LAST_DAY_AFTER_FIRST,
  REPEAT_UNTIL_AFTER_FIRST,
  SHIFT_KIND_LABELS,
  SHIFT_KINDS,
  SHIFT_REPEAT_MAX,
  SHIFT_REPEAT_UNIT_LABELS,
  SHIFT_REPEAT_UNITS,
  repeatLabel,
  type ShiftKind,
  type ShiftRepeatUnit,
} from '../schema';
import { DialogShell } from './dialog-shell';

export function ShiftFormDialog({
  shift,
  defaultDate,
  kinds,
  trigger,
  variant,
  size,
}: {
  shift?: ShiftRow;
  defaultDate: string;
  /** The user's own kinds, offered beside the built-in ones. */
  kinds: ShiftKindRow[];
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <DialogShell
      title={shift ? 'Edit shift' : 'Add a shift'}
      description="One day, a block of days, or a block that comes back every few weeks. Anything placed on a date replaces the pattern for that date."
      trigger={trigger}
      variant={variant}
      size={size}
    >
      {(close) => <ShiftForm shift={shift} defaultDate={defaultDate} kinds={kinds} close={close} />}
    </DialogShell>
  );
}

function ShiftForm({
  shift,
  defaultDate,
  kinds,
  close,
}: {
  shift?: ShiftRow;
  defaultDate: string;
  kinds: ShiftKindRow[];
  close: () => void;
}) {
  const action = shift ? updateShiftAction : createShiftAction;
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  // A built-in key, or `kind:<id>` for one of the user's own.
  const [kindChoice, setKindChoice] = useState(
    shift?.kindId ? `kind:${shift.kindId}` : (shift?.kind ?? 'work')
  );
  const [addingKind, setAddingKind] = useState(false);
  const [newKindCountsAs, setNewKindCountsAs] = useState<ShiftKind>('work');
  const chosenKind = kinds.find((k) => `kind:${k.id}` === kindChoice);
  /** What the days will count as, which also decides whether times make sense. */
  const kind: ShiftKind = addingKind
    ? newKindCountsAs
    : (chosenKind?.countsAs ?? (kindChoice as ShiftKind));
  const [firstDay, setFirstDay] = useState(shift?.date ?? defaultDate);
  const [lastDay, setLastDay] = useState(shift?.endDate ?? '');
  const [repeatUnit, setRepeatUnit] = useState<ShiftRepeatUnit>(
    shift && shift.repeatEvery > 0 ? shift.repeatUnit : 'none'
  );
  const [repeatEvery, setRepeatEvery] = useState(String(shift?.repeatEvery || 1));
  const [until, setUntil] = useState(shift?.repeatUntil ?? '');
  const repeats = repeatUnit !== 'none';
  const everyLabel = repeats ? repeatLabel(Number(repeatEvery) || 1, repeatUnit) : '';
  // Phone pickers ignore `min`, so the order of the days is checked here as well.
  const lastTooEarly = Boolean(lastDay) && lastDay < firstDay;
  const untilTooEarly = repeats && Boolean(until) && until < firstDay;
  const lastDayRef = useRef<HTMLInputElement>(null);
  const untilRef = useRef<HTMLInputElement>(null);
  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        if (!lastTooEarly && !untilTooEarly) return;
        e.preventDefault();
        (lastTooEarly ? lastDayRef : untilRef).current?.focus();
      }}
    >
      {shift && <input type="hidden" name="id" value={shift.id} />}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'date')}>
            <FieldLabel htmlFor="shift-date">First day</FieldLabel>
            <Input
              id="shift-date"
              name="date"
              type="date"
              value={firstDay}
              onChange={(e) => {
                const next = e.target.value;
                // The block keeps its length when its first day moves.
                setLastDay((current) => moveWith(current, firstDay, next));
                setFirstDay(next);
              }}
              required
              autoFocus
            />
            <FieldError errors={fieldErrors(state, 'date')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'endDate') || lastTooEarly}>
            <FieldLabel htmlFor="shift-end-date">Last day</FieldLabel>
            <Input
              ref={lastDayRef}
              id="shift-end-date"
              name="endDate"
              type="date"
              value={lastDay}
              onChange={(e) => setLastDay(e.target.value)}
              min={firstDay || undefined}
              aria-invalid={lastTooEarly || undefined}
            />
            <FieldDescription>Leave empty for a single day.</FieldDescription>
            <FieldError
              errors={
                lastTooEarly ? [{ message: LAST_DAY_AFTER_FIRST }] : fieldErrors(state, 'endDate')
              }
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'kind') || hasFieldError(state, 'newKind')}>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor={addingKind ? 'shift-kind-name' : 'shift-kind'}>Kind</FieldLabel>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-primary hover:text-primary -my-1"
                onClick={() => setAddingKind((v) => !v)}
              >
                {addingKind ? (
                  'Pick existing'
                ) : (
                  <>
                    <PlusIcon aria-hidden />
                    New kind
                  </>
                )}
              </Button>
            </div>
            <input type="hidden" name="kind" value={addingKind ? newKindCountsAs : kindChoice} />
            {addingKind ? (
              <div className="flex flex-col gap-2">
                <Input
                  id="shift-kind-name"
                  name="newKind"
                  aria-label="Kind name"
                  placeholder="Early, Night, Training"
                  maxLength={KIND_NAME_MAX}
                  required
                  autoFocus
                />
                <NativeSelect
                  name="newKindCountsAs"
                  aria-label="Counts as"
                  value={newKindCountsAs}
                  onChange={(e) => setNewKindCountsAs(e.target.value as ShiftKind)}
                >
                  {SHIFT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      Counts as {SHIFT_KIND_LABELS[k].toLowerCase()}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : (
              <NativeSelect
                id="shift-kind"
                value={kindChoice}
                onChange={(e) => setKindChoice(e.target.value)}
              >
                {SHIFT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {SHIFT_KIND_LABELS[k]}
                  </option>
                ))}
                {kinds.length > 0 && (
                  <optgroup label="Your kinds">
                    {kinds.map((k) => (
                      <option key={k.id} value={`kind:${k.id}`}>
                        {k.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </NativeSelect>
            )}
            <FieldDescription>
              {kind === 'off'
                ? 'Days off, even if the pattern says otherwise.'
                : 'Replaces whatever the pattern has on those days.'}
            </FieldDescription>
            <FieldError errors={fieldErrors(state, 'newKind') ?? fieldErrors(state, 'kind')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'label')}>
            <FieldLabel htmlFor="shift-label">Label</FieldLabel>
            <Input
              id="shift-label"
              name="label"
              defaultValue={shift?.label ?? ''}
              maxLength={60}
              placeholder={kind === 'off' ? 'Swapped with Ana' : 'Overtime, cover, training'}
            />
            <FieldError errors={fieldErrors(state, 'label')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'startTime')}>
            <FieldLabel htmlFor="shift-start">Start</FieldLabel>
            <Input
              id="shift-start"
              name="startTime"
              type="time"
              defaultValue={shift?.startTime?.slice(0, 5) ?? ''}
              disabled={kind === 'off'}
            />
            <FieldError errors={fieldErrors(state, 'startTime')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'endTime')}>
            <FieldLabel htmlFor="shift-end">End</FieldLabel>
            <Input
              id="shift-end"
              name="endTime"
              type="time"
              defaultValue={shift?.endTime?.slice(0, 5) ?? ''}
              disabled={kind === 'off'}
            />
            <FieldDescription>An end before the start runs into the next day.</FieldDescription>
            <FieldError errors={fieldErrors(state, 'endTime')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'repeatUnit')}>
            <FieldLabel htmlFor="shift-repeat">Repeats</FieldLabel>
            <NativeSelect
              id="shift-repeat"
              name="repeatUnit"
              value={repeatUnit}
              onChange={(e) => setRepeatUnit(e.target.value as ShiftRepeatUnit)}
            >
              {SHIFT_REPEAT_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {SHIFT_REPEAT_UNIT_LABELS[unit]}
                </option>
              ))}
            </NativeSelect>
            <FieldError errors={fieldErrors(state, 'repeatUnit')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'repeatEvery')}>
            <FieldLabel htmlFor="shift-repeat-every">Every</FieldLabel>
            <Input
              id="shift-repeat-every"
              name="repeatEvery"
              type="number"
              inputMode="numeric"
              min={1}
              max={SHIFT_REPEAT_MAX}
              value={repeatEvery}
              onChange={(e) => setRepeatEvery(e.target.value)}
              disabled={!repeats}
            />
            <FieldDescription>
              {repeats
                ? everyLabel.charAt(0).toUpperCase() + everyLabel.slice(1)
                : 'How many weeks or months apart.'}
            </FieldDescription>
            <FieldError errors={fieldErrors(state, 'repeatEvery')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={hasFieldError(state, 'repeatUntil') || untilTooEarly}>
            <FieldLabel htmlFor="shift-repeat-until">Repeat until</FieldLabel>
            <Input
              ref={untilRef}
              id="shift-repeat-until"
              name="repeatUntil"
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              min={firstDay || undefined}
              aria-invalid={untilTooEarly || undefined}
              disabled={!repeats}
            />
            <FieldDescription>
              {repeats ? 'Leave empty to keep it going.' : 'Only for a shift that repeats.'}
            </FieldDescription>
            <FieldError
              errors={
                untilTooEarly
                  ? [{ message: REPEAT_UNTIL_AFTER_FIRST }]
                  : fieldErrors(state, 'repeatUntil')
              }
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="shift-note">Note</FieldLabel>
          <Textarea id="shift-note" name="note" rows={2} defaultValue={shift?.note ?? ''} />
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{shift ? 'Save changes' : 'Add shift'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
