'use server';

import { revalidatePath } from 'next/cache';
import { moveCard, normaliseLayout, toggleCard } from '@/features/dashboard/layout';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { ensureProfile } from '@/features/auth/service';
import { requireUser } from '@/lib/auth';
import { formValues, fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import type { WeekStartsOn } from '@/lib/dates';
import { deleteInput, modulesFromForm, preferencesInput, profileInput } from './schema';
import { getPreferences, updateDashboardLayout, updatePreferences, updateProfile } from './service';

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = profileInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await updateProfile(user.id, { displayName: parsed.data.displayName || null });
    revalidatePath('/', 'layout');
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function updatePreferencesAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = preferencesInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await updatePreferences(user.id, {
      timeZone: parsed.data.timeZone,
      weekStartsOn: parsed.data.weekStartsOn as WeekStartsOn,
    });
    revalidatePath('/', 'layout');
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

export async function updateModulesAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await updatePreferences(user.id, { enabledModules: modulesFromForm(formValues(formData)) });
    revalidatePath('/', 'layout');
    return ok(undefined);
  } catch (e) {
    return fromError(e);
  }
}

/**
 * Removes every planner row for the user by deleting the planner profile
 * (all tables cascade from it), then recreates an empty profile. The shared
 * Supabase login is untouched.
 */
export async function deleteAllDataAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
    const parsed = deleteInput.safeParse(formValues(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    await db.delete(profiles).where(eq(profiles.id, user.id));
    const meta = user.user_metadata ?? {};
    await ensureProfile({
      id: user.id,
      email: user.email,
      displayName: meta.full_name ?? meta.name ?? null,
    });
    revalidatePath('/', 'layout');
  } catch (e) {
    return fromError(e);
  }
  redirect('/dashboard');
}

export async function moveDashboardCardAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const key = String(formData.get('key') ?? '');
  const direction = formData.get('direction') === '-1' ? -1 : 1;
  const prefs = await getPreferences(user.id);
  await updateDashboardLayout(
    user.id,
    moveCard(normaliseLayout(prefs.dashboardLayout), key, direction)
  );
  revalidatePath('/dashboard');
  revalidatePath('/settings');
}

export async function toggleDashboardCardAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const key = String(formData.get('key') ?? '');
  const visible = formData.get('visible') === '1';
  const prefs = await getPreferences(user.id);
  await updateDashboardLayout(
    user.id,
    toggleCard(normaliseLayout(prefs.dashboardLayout), key, visible)
  );
  revalidatePath('/dashboard');
  revalidatePath('/settings');
}

export async function resetDashboardLayoutAction(): Promise<void> {
  const user = await requireUser();
  await updateDashboardLayout(user.id, null);
  revalidatePath('/dashboard');
  revalidatePath('/settings');
}
