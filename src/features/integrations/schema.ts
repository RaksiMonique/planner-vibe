import { z } from 'zod';

export const reminderChannelsInput = z.object({
  emailReminders: z.boolean(),
  pushReminders: z.boolean(),
  digestHour: z.coerce.number().int().min(0).max(23),
});
export type ReminderChannelsInput = z.infer<typeof reminderChannelsInput>;
