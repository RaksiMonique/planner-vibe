import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  DEFAULT_ENABLED_MODULES,
  profiles,
  userPreferences,
  type DashboardLayout,
  type EnabledModules,
} from '@/db/schema';
import type { WeekStartsOn } from '@/lib/dates';

export type Preferences = {
  timeZone: string;
  weekStartsOn: WeekStartsOn;
  /** ISO 4217 code for prices and budgets. */
  currency: string;
  enabledModules: EnabledModules;
  dashboardLayout: DashboardLayout | null;
};

/** Returns the user's preferences, creating the default row on first use. */
export async function getPreferences(userId: string): Promise<Preferences> {
  const [row] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  if (row) {
    return {
      timeZone: row.timeZone,
      weekStartsOn: row.weekStartsOn as WeekStartsOn,
      currency: row.currency,
      enabledModules: { ...DEFAULT_ENABLED_MODULES, ...row.enabledModules },
      dashboardLayout: row.dashboardLayout ?? null,
    };
  }
  const [created] = await db
    .insert(userPreferences)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  return {
    timeZone: created?.timeZone ?? 'America/Jamaica',
    weekStartsOn: (created?.weekStartsOn ?? 1) as WeekStartsOn,
    currency: created?.currency ?? 'USD',
    enabledModules: DEFAULT_ENABLED_MODULES,
    dashboardLayout: null,
  };
}

export async function updatePreferences(userId: string, patch: Partial<Preferences>) {
  await getPreferences(userId);
  await db.update(userPreferences).set(patch).where(eq(userPreferences.userId, userId));
}

export type Profile = { id: string; email: string; displayName: string | null };

export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await db
    .select({ id: profiles.id, email: profiles.email, displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row ?? null;
}

export async function updateProfile(userId: string, patch: { displayName: string | null }) {
  await db.update(profiles).set(patch).where(eq(profiles.id, userId));
}

export async function updateDashboardLayout(
  userId: string,
  layout: DashboardLayout | null
): Promise<void> {
  await db
    .update(userPreferences)
    .set({ dashboardLayout: layout })
    .where(eq(userPreferences.userId, userId));
}
