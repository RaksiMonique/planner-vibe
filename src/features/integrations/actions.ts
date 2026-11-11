'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { reminderChannelsInput } from './schema';
import { disableIcsFeed, rotateIcsToken, updateReminderChannels } from './service';

const PAGE = '/settings/integrations';

export async function enableIcsFeedAction(): Promise<void> {
  const user = await requireUser();
  await rotateIcsToken(user.id);
  revalidatePath(PAGE);
}

export async function rotateIcsFeedAction(): Promise<void> {
  const user = await requireUser();
  await rotateIcsToken(user.id);
  revalidatePath(PAGE);
}

export async function disableIcsFeedAction(): Promise<void> {
  const user = await requireUser();
  await disableIcsFeed(user.id);
  revalidatePath(PAGE);
}

export async function updateReminderChannelsAction(
  _prev: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const values = formValues(formData);
    const parsed = reminderChannelsInput.safeParse({
      emailReminders: values.emailReminders === 'on',
      pushReminders: values.pushReminders === 'on',
      digestHour: values.digestHour,
    });
    if (!parsed.success) return fromZodError(parsed.error);
    await updateReminderChannels(user.id, parsed.data);
    revalidatePath(PAGE);
    return ok(null);
  } catch (e) {
    return fromError(e);
  }
}
