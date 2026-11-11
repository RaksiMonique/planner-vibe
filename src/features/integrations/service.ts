import 'server-only';
import { randomBytes } from 'node:crypto';
import { count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { calendarConnections, pushSubscriptions, userPreferences } from '@/db/schema';
import type { ReminderChannelsInput } from './schema';

export type IntegrationSettings = {
  icsToken: string | null;
  emailReminders: boolean;
  pushReminders: boolean;
  digestHour: number;
  pushDevices: number;
  connection: {
    status: 'connected' | 'error' | 'revoked';
    accountEmail: string | null;
    calendarName: string | null;
    lastSyncedAt: Date | null;
    lastError: string | null;
  } | null;
};

export async function getIntegrationSettings(userId: string): Promise<IntegrationSettings> {
  const [prefs] = await db
    .select({
      icsToken: userPreferences.icsToken,
      emailReminders: userPreferences.emailReminders,
      pushReminders: userPreferences.pushReminders,
      digestHour: userPreferences.digestHour,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  const [[devices], [connection]] = await Promise.all([
    db.select({ n: count() }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)),
    db
      .select({
        status: calendarConnections.status,
        accountEmail: calendarConnections.accountEmail,
        calendarName: calendarConnections.calendarName,
        lastSyncedAt: calendarConnections.lastSyncedAt,
        lastError: calendarConnections.lastError,
      })
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, userId))
      .limit(1),
  ]);
  return {
    icsToken: prefs?.icsToken ?? null,
    emailReminders: prefs?.emailReminders ?? false,
    pushReminders: prefs?.pushReminders ?? false,
    digestHour: prefs?.digestHour ?? 7,
    pushDevices: Number(devices?.n ?? 0),
    connection: connection ?? null,
  };
}

/** A fresh secret for the feed URL; any previous URL stops working. */
export async function rotateIcsToken(userId: string): Promise<string> {
  const token = randomBytes(24).toString('base64url');
  await db
    .update(userPreferences)
    .set({ icsToken: token })
    .where(eq(userPreferences.userId, userId));
  return token;
}

export async function disableIcsFeed(userId: string): Promise<void> {
  await db
    .update(userPreferences)
    .set({ icsToken: null })
    .where(eq(userPreferences.userId, userId));
}

export async function findUserIdByIcsToken(token: string): Promise<string | null> {
  if (!token || token.length < 16) return null;
  const [row] = await db
    .select({ userId: userPreferences.userId })
    .from(userPreferences)
    .where(eq(userPreferences.icsToken, token))
    .limit(1);
  return row?.userId ?? null;
}

export async function updateReminderChannels(
  userId: string,
  input: ReminderChannelsInput
): Promise<void> {
  await db.update(userPreferences).set(input).where(eq(userPreferences.userId, userId));
}

export function icsFeedUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/$/, '')}/api/calendar/feed.ics?token=${token}`;
}
