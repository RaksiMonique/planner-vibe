'use client';

import { useEffect, useState } from 'react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { loadReminderPreset } from '../actions';
import { REMINDER_LABELS, REMINDER_PRESETS, type ReminderPreset } from '../schema';
import type { ReminderEntity } from '../service';

/**
 * "Remind me" control for task and event forms. Submits `reminder` (preset)
 * and `reminderAt` (custom datetime-local). When editing, it loads the
 * record's existing reminder so the right preset shows.
 */
export function ReminderField({
  entityType,
  entityId,
  idPrefix,
}: {
  entityType: ReminderEntity;
  entityId?: string | null;
  idPrefix: string;
}) {
  const [preset, setPreset] = useState<ReminderPreset>('none');
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!entityId) return;
    let active = true;
    void loadReminderPreset(entityType, entityId).then((result) => {
      if (!active || !result.ok) return;
      setPreset(result.data.preset);
      setCustom(result.data.custom);
    });
    return () => {
      active = false;
    };
  }, [entityType, entityId]);

  return (
    <Field>
      <FieldLabel htmlFor={`${idPrefix}-reminder`}>Remind me</FieldLabel>
      <NativeSelect
        id={`${idPrefix}-reminder`}
        name="reminder"
        value={preset}
        onChange={(e) => setPreset(e.target.value as ReminderPreset)}
      >
        {REMINDER_PRESETS.map((p) => (
          <option key={p} value={p}>
            {REMINDER_LABELS[p]}
          </option>
        ))}
      </NativeSelect>
      {preset === 'custom' ? (
        <Input
          id={`${idPrefix}-reminder-at`}
          name="reminderAt"
          type="datetime-local"
          aria-label="Reminder date and time"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          required
        />
      ) : (
        <FieldDescription>
          {preset === 'none'
            ? 'In-app only for now; it shows in the bell when due.'
            : 'Date-only records are reminded at 09:00.'}
        </FieldDescription>
      )}
    </Field>
  );
}
