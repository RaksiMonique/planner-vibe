'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { fail, fromError, ok, type ActionResult } from '@/lib/action-result';
import type { ReminderPreset } from './schema';
import { markAllRead, markRead, reminderPresetFor, type ReminderEntity } from './service';

const entityType = z.enum(['task', 'event', 'habit', 'routine', 'time_block']);

function refresh() {
  // The bell lives in the shell, so every page shows the new count.
  revalidatePath('/', 'layout');
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!z.uuid().safeParse(id).success) return fail('Which notification?');
    await markRead(user.id, id);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markAllRead(user.id);
    refresh();
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

/** The preset and custom value a form should show for a record's existing reminder. */
export async function loadReminderPreset(
  type: ReminderEntity,
  entityId: string
): Promise<ActionResult<{ preset: ReminderPreset; custom: string }>> {
  try {
    const user = await requireUser();
    const parsedType = entityType.safeParse(type);
    if (!parsedType.success || !z.uuid().safeParse(entityId).success) {
      return fail('Unknown record.');
    }
    return ok(await reminderPresetFor(user.id, parsedType.data, entityId));
  } catch (e) {
    return fromError(e);
  }
}
