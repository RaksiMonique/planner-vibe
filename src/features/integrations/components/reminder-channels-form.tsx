'use client';

import { useActionState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { SubmitButton } from '@/components/shared/submit-button';
import { updateReminderChannelsAction } from '../actions';

export function ReminderChannelsForm({
  emailReminders,
  pushReminders,
  digestHour,
  emailConfigured,
  pushConfigured,
  pushDevices,
}: {
  emailReminders: boolean;
  pushReminders: boolean;
  digestHour: number;
  emailConfigured: boolean;
  pushConfigured: boolean;
  pushDevices: number;
}) {
  const [state, action] = useActionState(updateReminderChannelsAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-2 text-sm">
          <Checkbox name="emailReminders" defaultChecked={emailReminders} className="mt-0.5" />
          <span>
            <span className="font-medium">Email</span>
            <span className="text-muted-foreground block text-xs">
              A daily digest of today&apos;s reminders and overdue tasks, plus reminders as they
              fall due.
              {!emailConfigured && ' Email sending is not configured on this deployment yet.'}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox name="pushReminders" defaultChecked={pushReminders} className="mt-0.5" />
          <span>
            <span className="font-medium">Browser push</span>
            <span className="text-muted-foreground block text-xs">
              Reminders on this device even when the planner is closed.{' '}
              {pushConfigured
                ? `${pushDevices} device${pushDevices === 1 ? '' : 's'} subscribed.`
                : 'Push is not configured on this deployment yet.'}
            </span>
          </span>
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="digest-hour">Daily digest at</Label>
        <NativeSelect
          id="digest-hour"
          name="digestHour"
          defaultValue={String(digestHour)}
          className="w-32"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, '0')}:00
            </option>
          ))}
        </NativeSelect>
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm">Saved.</p>}
      <SubmitButton size="sm" pendingLabel="Saving…">
        Save reminder settings
      </SubmitButton>
    </form>
  );
}
