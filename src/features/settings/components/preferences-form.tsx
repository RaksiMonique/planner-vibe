'use client';

import { useActionState } from 'react';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SubmitButton } from '@/components/shared/submit-button';
import { updatePreferencesAction } from '../actions';
import { TIME_ZONES, WEEK_START_OPTIONS } from '../schema';
import { FormStatus } from './form-status';

export function PreferencesForm({
  timeZone,
  weekStartsOn,
}: {
  timeZone: string;
  weekStartsOn: number;
}) {
  const [state, action] = useActionState(updatePreferencesAction, null);
  const zones = TIME_ZONES.includes(timeZone) ? TIME_ZONES : [timeZone, ...TIME_ZONES];
  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="timeZone">Time zone</FieldLabel>
          <Select
            name="timeZone"
            defaultValue={timeZone}
            items={zones.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))}
          >
            <SelectTrigger id="timeZone" className="w-full sm:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z} value={z}>
                  {z.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Today, due dates and check-ins are worked out in this zone.
          </FieldDescription>
          <FieldError
            errors={
              state && !state.ok
                ? state.fieldErrors?.timeZone?.map((message) => ({ message }))
                : undefined
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="weekStartsOn">Week starts on</FieldLabel>
          <Select
            name="weekStartsOn"
            defaultValue={String(weekStartsOn)}
            items={WEEK_START_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          >
            <SelectTrigger id="weekStartsOn" className="w-full sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_START_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm">Save preferences</SubmitButton>
        <FormStatus state={state} savedText="Preferences saved." />
      </div>
    </form>
  );
}
