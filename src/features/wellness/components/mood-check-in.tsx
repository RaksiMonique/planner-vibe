'use client';

import { useActionState, useState } from 'react';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import { fieldErrors, hasFieldError } from '@/features/life-segments/components/field-errors';
import type { ActionResult } from '@/lib/action-result';
import { saveMoodAction } from '../actions';
import type { MoodEntry } from '../queries';
import { ENERGY_WORDS, MOOD_WORDS } from '../schema';
import { MoodScale } from './mood-scale';

/** The full check-in for one day: mood, energy and a note. */
export function MoodCheckIn({ dateKey, entry }: { dateKey: string; entry: MoodEntry | null }) {
  const [state, formAction] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => saveMoodAction(prev, formData),
    null
  );
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [energy, setEnergy] = useState<number | null>(entry?.energy ?? null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="date" value={dateKey} />
      <FieldGroup>
        <Field data-invalid={hasFieldError(state, 'mood')}>
          <MoodScale label="Mood" name="mood" value={mood} onChange={setMood} words={MOOD_WORDS} />
          <FieldError errors={fieldErrors(state, 'mood')} />
        </Field>
        <Field data-invalid={hasFieldError(state, 'energy')}>
          <MoodScale
            label="Energy"
            name="energy"
            value={energy}
            onChange={setEnergy}
            words={ENERGY_WORDS}
          />
          <FieldError errors={fieldErrors(state, 'energy')} />
        </Field>
        <Field data-invalid={hasFieldError(state, 'note')}>
          <FieldLabel htmlFor="mood-note">Note</FieldLabel>
          <Textarea
            id="mood-note"
            name="note"
            rows={2}
            maxLength={1000}
            defaultValue={entry?.note ?? ''}
            placeholder="What shaped today? Optional."
          />
          <FieldError errors={fieldErrors(state, 'note')} />
        </Field>
      </FieldGroup>
      <div className="flex items-center gap-3">
        <SubmitButton disabled={mood === null || energy === null}>
          {entry ? 'Update check-in' : 'Save check-in'}
        </SubmitButton>
        {state?.ok && <span className="text-muted-foreground text-xs">Saved.</span>}
        {state && !state.ok && (
          <span role="alert" className="text-destructive text-sm">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
