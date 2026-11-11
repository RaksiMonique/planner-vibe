import 'server-only';
import { addDays, addSeconds, isBefore, subDays } from 'date-fns';
import { and, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { calendarConnections, events, externalEvents } from '@/db/schema';
import { getPreferences } from '@/features/settings/service';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import * as google from './google';

/**
 * Google Calendar sync (instructions.md 9.1): planner events are written to
 * the chosen Google calendar; that calendar's own events are copied into
 * external_events and shown read-only. Conflicts cannot arise because each
 * side owns its records: the planner never edits Google's events and Google
 * edits to planner-owned events are overwritten on the next push.
 */

export type Connection = typeof calendarConnections.$inferSelect;

export async function getConnection(userId: string): Promise<Connection | null> {
  const [row] = await db
    .select()
    .from(calendarConnections)
    .where(and(eq(calendarConnections.userId, userId), eq(calendarConnections.provider, 'google')))
    .limit(1);
  return row ?? null;
}

/** Stores freshly exchanged tokens; keeps the old refresh token when Google omits a new one. */
export async function saveConnection(
  userId: string,
  tokens: google.TokenResponse,
  accountEmail: string | null
): Promise<Connection> {
  const existing = await getConnection(userId);
  const accessToken = encryptSecret(tokens.access_token);
  const refreshToken = tokens.refresh_token
    ? encryptSecret(tokens.refresh_token)
    : (existing?.refreshToken ?? null);
  const tokenExpiresAt = addSeconds(new Date(), Math.max(60, tokens.expires_in - 60));
  const values = {
    accessToken,
    refreshToken,
    tokenExpiresAt,
    accountEmail: accountEmail ?? existing?.accountEmail ?? null,
    status: 'connected' as const,
    lastError: null,
  };
  if (existing) {
    const [row] = await db
      .update(calendarConnections)
      .set(values)
      .where(eq(calendarConnections.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(calendarConnections)
    .values({
      userId,
      provider: 'google',
      calendarId: 'primary',
      calendarName: 'Primary',
      ...values,
    })
    .returning();
  return row;
}

async function accessTokenFor(conn: Connection): Promise<string> {
  if (conn.tokenExpiresAt && isBefore(new Date(), conn.tokenExpiresAt)) {
    return decryptSecret(conn.accessToken);
  }
  if (!conn.refreshToken)
    throw new Error('The Google connection has no refresh token; connect again.');
  const refreshed = await google.refreshAccessToken(decryptSecret(conn.refreshToken));
  await db
    .update(calendarConnections)
    .set({
      accessToken: encryptSecret(refreshed.access_token),
      tokenExpiresAt: addSeconds(new Date(), Math.max(60, refreshed.expires_in - 60)),
    })
    .where(eq(calendarConnections.id, conn.id));
  return refreshed.access_token;
}

export async function listGoogleCalendars(userId: string): Promise<google.GoogleCalendar[]> {
  const conn = await getConnection(userId);
  if (!conn) return [];
  return google.listCalendars(await accessTokenFor(conn));
}

/** Changes the target calendar: planner events are re-pushed there and the pull starts over. */
export async function setTargetCalendar(
  userId: string,
  calendarId: string,
  calendarName: string
): Promise<void> {
  const conn = await getConnection(userId);
  if (!conn) throw new Error('Google Calendar is not connected.');
  if (conn.calendarId && conn.calendarId !== calendarId) {
    // Best effort: remove the copies from the previous calendar.
    try {
      const token = await accessTokenFor(conn);
      const pushed = await db
        .select({ externalId: events.externalId })
        .from(events)
        .where(and(eq(events.userId, userId), isNotNull(events.externalId)));
      for (const row of pushed) {
        if (row.externalId) await google.deleteEvent(token, conn.calendarId, row.externalId);
      }
    } catch {
      // The old copies stay in the old calendar; nothing else depends on them.
    }
  }
  await db.transaction(async (tx) => {
    await tx
      .update(calendarConnections)
      .set({ calendarId, calendarName, syncToken: null, lastSyncedAt: null })
      .where(eq(calendarConnections.id, conn.id));
    await tx.delete(externalEvents).where(eq(externalEvents.connectionId, conn.id));
    await tx
      .update(events)
      .set({ externalId: null, externalSyncedAt: null })
      .where(eq(events.userId, userId));
  });
}

export async function disconnectGoogle(userId: string): Promise<void> {
  const conn = await getConnection(userId);
  if (!conn) return;
  await db.transaction(async (tx) => {
    await tx.delete(calendarConnections).where(eq(calendarConnections.id, conn.id));
    await tx
      .update(events)
      .set({ externalId: null, externalSyncedAt: null })
      .where(eq(events.userId, userId));
  });
}

export type SyncResult = { pushed: number; removed: number; pulled: number; error: string | null };

export async function syncGoogle(
  userId: string,
  opts: { full?: boolean } = {}
): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, removed: 0, pulled: 0, error: null };
  const conn = await getConnection(userId);
  if (!conn || conn.status === 'revoked' || !conn.calendarId) return result;
  try {
    const token = await accessTokenFor(conn);
    const { timeZone } = await getPreferences(userId);
    const now = new Date();

    // Push: live parent events that are new or changed since their last push.
    const toPush = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.userId, userId),
          isNull(events.deletedAt),
          isNull(events.recurrenceParentId),
          or(isNull(events.externalId), sql`${events.updatedAt} > ${events.externalSyncedAt}`)
        )
      );
    for (const event of toPush) {
      const body = google.toGoogleEvent(event, timeZone);
      if (!body) continue;
      let remote: google.GoogleEvent;
      if (event.externalId) {
        try {
          remote = await google.updateEvent(token, conn.calendarId, event.externalId, body);
        } catch (e) {
          if (e instanceof google.GoogleError && (e.status === 404 || e.status === 410)) {
            remote = await google.insertEvent(token, conn.calendarId, body);
          } else throw e;
        }
      } else {
        remote = await google.insertEvent(token, conn.calendarId, body);
      }
      await db
        .update(events)
        .set({ externalId: remote.id, externalSyncedAt: new Date() })
        .where(eq(events.id, event.id));
      result.pushed++;
    }

    // Remove: planner events deleted since they were pushed.
    const toRemove = await db
      .select({ id: events.id, externalId: events.externalId })
      .from(events)
      .where(
        and(eq(events.userId, userId), isNotNull(events.deletedAt), isNotNull(events.externalId))
      );
    for (const row of toRemove) {
      await google.deleteEvent(token, conn.calendarId, row.externalId!);
      await db.update(events).set({ externalId: null }).where(eq(events.id, row.id));
      result.removed++;
    }

    // Pull: the calendar's own events, incrementally when Google still honours the sync token.
    let page: google.EventPage;
    let full = opts.full || !conn.syncToken;
    try {
      page = await google.listEvents(token, conn.calendarId, {
        syncToken: full ? null : conn.syncToken,
        timeMin: subDays(now, 30),
        timeMax: addDays(now, 365),
      });
    } catch (e) {
      if (e instanceof google.GoogleError && e.status === 410) {
        full = true;
        page = await google.listEvents(token, conn.calendarId, {
          timeMin: subDays(now, 30),
          timeMax: addDays(now, 365),
        });
      } else throw e;
    }
    await db.transaction(async (tx) => {
      if (full) await tx.delete(externalEvents).where(eq(externalEvents.connectionId, conn.id));
      for (const item of page.items) {
        if (item.status === 'cancelled') {
          await tx
            .delete(externalEvents)
            .where(
              and(eq(externalEvents.connectionId, conn.id), eq(externalEvents.externalId, item.id))
            );
          continue;
        }
        const row = google.fromGoogleEvent(item);
        if (!row) continue;
        await tx
          .insert(externalEvents)
          .values({ userId, connectionId: conn.id, ...row })
          .onConflictDoUpdate({
            target: [externalEvents.connectionId, externalEvents.externalId],
            set: { ...row, updatedAt: new Date() },
          });
        result.pulled++;
      }
      await tx
        .update(calendarConnections)
        .set({
          syncToken: page.nextSyncToken ?? conn.syncToken,
          lastSyncedAt: new Date(),
          status: 'connected',
          lastError: null,
        })
        .where(eq(calendarConnections.id, conn.id));
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const revoked =
      e instanceof google.GoogleError && (e.status === 401 || /invalid_grant/.test(message));
    await db
      .update(calendarConnections)
      .set({ status: revoked ? 'revoked' : 'error', lastError: message.slice(0, 500) })
      .where(eq(calendarConnections.id, conn.id));
    result.error = message;
  }
  return result;
}

/** Fire-and-forget push of one event after it was saved; never throws. */
export async function pushEventSoon(userId: string, eventId: string): Promise<void> {
  try {
    const conn = await getConnection(userId);
    if (!conn || conn.status !== 'connected' || !conn.calendarId) return;
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.userId, userId)));
    if (!event) return;
    const token = await accessTokenFor(conn);
    if (event.deletedAt) {
      if (event.externalId) {
        await google.deleteEvent(token, conn.calendarId, event.externalId);
        await db.update(events).set({ externalId: null }).where(eq(events.id, event.id));
      }
      return;
    }
    const { timeZone } = await getPreferences(userId);
    const body = google.toGoogleEvent(event, timeZone);
    if (!body) return;
    const remote = event.externalId
      ? await google.updateEvent(token, conn.calendarId, event.externalId, body)
      : await google.insertEvent(token, conn.calendarId, body);
    await db
      .update(events)
      .set({ externalId: remote.id, externalSyncedAt: new Date() })
      .where(eq(events.id, event.id));
  } catch (e) {
    console.error('[google] push failed', e);
  }
}

/** External events in a window, for the Life Calendar. */
export async function listExternalEventsBetween(userId: string, from: Date, to: Date) {
  const fromKey = from.toISOString().slice(0, 10);
  const toKey = to.toISOString().slice(0, 10);
  return db
    .select()
    .from(externalEvents)
    .where(
      and(
        eq(externalEvents.userId, userId),
        or(
          and(
            isNotNull(externalEvents.startsAt),
            sql`${externalEvents.startsAt} < ${to}`,
            sql`coalesce(${externalEvents.endsAt}, ${externalEvents.startsAt}) >= ${from}`
          ),
          and(
            isNotNull(externalEvents.allDayDate),
            sql`${externalEvents.allDayDate} <= ${toKey}`,
            sql`coalesce(${externalEvents.allDayEnd}, ${externalEvents.allDayDate}) >= ${fromKey}`
          )
        )
      )
    );
}
