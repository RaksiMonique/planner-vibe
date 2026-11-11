'use client';

import { useActionState, useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SegmentDot } from '@/components/shared/segment-badge';
import { SubmitButton } from '@/components/shared/submit-button';
import { ChoiceSelect } from '@/features/life-segments/components/choice-select';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import { ACCENT_LABELS, ACCENTS } from '@/features/life-segments/schema';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { ActionResult } from '@/lib/action-result';
import { createPatternAction, updatePatternAction } from '../actions';
import { describeCycle } from '../availability';
import type { ShiftPattern } from '../queries';
import {
  CYCLE_PRESETS,
  SHIFT_KIND_LABELS,
  SHIFT_KINDS,
  type PatternDayInput,
  type ShiftKind,
} from '../schema';
import { DialogShell } from './dialog-shell';

export function PatternFormDialog({
  pattern,
  defaultAnchorDate,
  trigger,
  variant,
  size,
}: {
  pattern?: ShiftPattern;
  /** Today in the user's zone, the anchor a new pattern starts from. */
  defaultAnchorDate: string;
  trigger: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}) {
  return (
    <DialogShell
      title={pattern ? 'Edit shift pattern' : 'New shift pattern'}
      description="A repeating cycle of days. Day 1 falls on the anchor date and the cycle repeats from there, backwards as well as forwards."
      trigger={trigger}
      variant={variant}
      size={size}
      className="sm:max-w-2xl"
    >
      {(close) => (
        <PatternForm pattern={pattern} defaultAnchorDate={defaultAnchorDate} close={close} />
      )}
    </DialogShell>
  );
}

const blankDay = (kind: ShiftKind = 'work'): PatternDayInput => ({ kind });

function PatternForm({
  pattern,
  defaultAnchorDate,
  close,
}: {
  pattern?: ShiftPattern;
  defaultAnchorDate: string;
  close: () => void;
}) {
  const action = pattern ? updatePatternAction : createPatternAction;
  const [state, formAction] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) close();
    return result;
  }, null);
  const [days, setDays] = useState<PatternDayInput[]>(() =>
    pattern && pattern.cycle.length > 0
      ? pattern.cycle.map((d) => ({ kind: d.kind, label: d.label, start: d.start, end: d.end }))
      : CYCLE_PRESETS[0].cycle.map((d) => ({ ...d }))
  );

  const update = (index: number, patch: Partial<PatternDayInput>) =>
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  const remove = (index: number) => setDays((prev) => prev.filter((_, i) => i !== index));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {pattern && <input type="hidden" name="id" value={pattern.id} />}
      <input type="hidden" name="cycle" value={JSON.stringify(days)} />
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <Field data-invalid={hasFieldError(state, 'name')}>
            <FieldLabel htmlFor="pattern-name">Name</FieldLabel>
            <Input
              id="pattern-name"
              name="name"
              defaultValue={pattern?.name}
              required
              maxLength={120}
              autoFocus
              placeholder="Ward rota"
            />
            <FieldError errors={fieldErrors(state, 'name')} />
          </Field>
          <Field data-invalid={hasFieldError(state, 'anchorDate')}>
            <FieldLabel htmlFor="pattern-anchor">Anchor date</FieldLabel>
            <Input
              id="pattern-anchor"
              name="anchorDate"
              type="date"
              defaultValue={pattern?.anchorDate ?? defaultAnchorDate}
              required
            />
            <FieldError errors={fieldErrors(state, 'anchorDate')} />
          </Field>
        </div>

        <fieldset
          className="flex flex-col gap-2"
          aria-invalid={hasFieldError(state, 'cycle') || undefined}
        >
          <legend className="mb-1.5 text-sm font-medium">
            Cycle{' '}
            <span className="text-muted-foreground font-normal">
              · {describeCycle(days)} · {days.length} day{days.length === 1 ? '' : 's'}
            </span>
          </legend>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Presets:</span>
            {CYCLE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setDays(preset.cycle.map((d) => ({ ...d })))}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <ol className="flex flex-col gap-1.5">
            {days.map((day, i) => (
              <li
                key={i}
                className="bg-card grid grid-cols-[3rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-lg border p-2 sm:grid-cols-[3rem_7rem_minmax(0,1fr)_5.5rem_5.5rem_2rem]"
              >
                <span className="text-muted-foreground text-xs">Day {i + 1}</span>
                <NativeSelect
                  aria-label={`Day ${i + 1} kind`}
                  value={day.kind}
                  onChange={(e) => update(i, { kind: e.target.value as ShiftKind })}
                >
                  {SHIFT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {SHIFT_KIND_LABELS[k]}
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="sm:order-last"
                  aria-label={`Remove day ${i + 1}`}
                  onClick={() => remove(i)}
                >
                  <XIcon />
                </Button>
                <div className="col-span-3 grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] gap-2 sm:contents">
                  <Input
                    aria-label={`Day ${i + 1} label`}
                    value={day.label ?? ''}
                    maxLength={60}
                    placeholder={day.kind === 'off' ? 'Rest' : 'Day shift'}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                  <Input
                    type="time"
                    aria-label={`Day ${i + 1} start`}
                    value={day.start ?? ''}
                    disabled={day.kind === 'off'}
                    onChange={(e) => update(i, { start: e.target.value })}
                  />
                  <Input
                    type="time"
                    aria-label={`Day ${i + 1} end`}
                    value={day.end ?? ''}
                    disabled={day.kind === 'off'}
                    onChange={(e) => update(i, { end: e.target.value })}
                  />
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDays((prev) => [...prev, blankDay()])}
            >
              <PlusIcon data-icon="inline-start" />
              Add day
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDays((prev) => [...prev, blankDay('off')])}
            >
              Add day off
            </Button>
            <FieldDescription className="basis-full">
              Times are optional; a shift without them shows as an all-day chip. An end before the
              start means the shift runs overnight.
            </FieldDescription>
          </div>
          <FieldError errors={fieldErrors(state, 'cycle')} />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="pattern-accent">Colour</FieldLabel>
            <ChoiceSelect
              id="pattern-accent"
              name="accent"
              defaultValue={pattern?.accent ?? 'burgundy'}
              options={ACCENTS.map((a) => ({
                value: a,
                label: (
                  <span className="flex items-center gap-2">
                    <SegmentDot accent={a} />
                    {ACCENT_LABELS[a]}
                  </span>
                ),
              }))}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-sm leading-none font-medium">Status</span>
            <Label className="h-8 cursor-pointer font-normal">
              <Checkbox name="isActive" defaultChecked={pattern?.isActive ?? true} />
              Active (shows on the calendar)
            </Label>
          </div>
        </div>
        <Field>
          <FieldLabel htmlFor="pattern-note">Note</FieldLabel>
          <Textarea id="pattern-note" name="note" rows={2} defaultValue={pattern?.note ?? ''} />
        </Field>
      </FieldGroup>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <SubmitButton>{pattern ? 'Save changes' : 'Create pattern'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
