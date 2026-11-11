import 'server-only';
import { addDays, subDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { and, eq, isNotNull, lt } from 'drizzle-orm';
import { db } from '@/db';
import { notifications, profiles, reminders, userPreferences } from '@/db/schema';
import { expandEvents } from '@/features/calendar/expand';
import { listEventsBetween } from '@/features/calendar/queries';
import { listTasks } from '@/features/tasks/queries';
import { DEFAULT_TIME_ZONE } from '@/lib/dates';
import { renderDigest, renderReminderEmail, type DigestItem } from './digest';
import { emailConfigured, sendEmail } from './email';
import { pushConfigured, sendPushToUser } from './push';
import { listNotifications } from './queries';
import { digestDue } from './schedule';
import { generateDueNotifications } from './service';
import { syncGoogle } from '@/features/integrations/google-sync';
import { calendarConnections } from '@/db/schema';

/**
 * The scheduled jobs (instructions.md 9.2): due reminders become in-app
 * notifications and, where the user asked, emails and pushes; the daily
 * digest goes out once per local day; old notifications are pruned. Any
 * query also counts as activity that keeps a free-plan project awake.
 */

export type CronSummary = {
  users: number;
  notifications: number;
  emails: number;
  pushes: number;
  digests: number;
  prunedNotifications: number;
  prunedReminders: number;
  googleSynced: number;
  errors: string[];
};

const KEEP_DAYS = 90;

type ActiveUser = {
  id: string;
  email: string;
  name: string | null;
  emailReminders: boolean;
  pushReminders: boolean;
  digestHour: number;
  digestSentOn: string | null;
  timeZone: string;
};

async function activeUsers(): Promise<ActiveUser[]> {
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      name: profiles.displayName,
      emailReminders: userPreferences.emailReminders,
      pushReminders: userPreferences.pushReminders,
      digestHour: userPreferences.digestHour,
      digestSentOn: userPreferences.digestSentOn,
      timeZone: userPreferences.timeZone,
    })
    .from(profiles)
    .leftJoin(userPreferences, eq(userPreferences.userId, profiles.id))
    .where(eq(profiles.accessStatus, 'approved'));
  return rows.map((r) => ({
    ...r,
    emailReminders: r.emailReminders ?? false,
    pushReminders: r.pushReminders ?? false,
    digestHour: r.digestHour ?? 7,
    timeZone: r.timeZone ?? DEFAULT_TIME_ZONE,
  }));
}

function empty(): CronSummary {
  return {
    users: 0,
    notifications: 0,
    emails: 0,
    pushes: 0,
    digests: 0,
    prunedNotifications: 0,
    prunedReminders: 0,
    googleSynced: 0,
    errors: [],
  };
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Reminders that fell due: in-app always, email and push when switched on. */
export async function processDueReminders(now: Date, siteUrl: string): Promise<CronSummary> {
  const summary = empty();
  const users = await activeUsers();
  summary.users = users.length;
  for (const user of users) {
    try {
      const created = await generateDueNotifications(user.id, now);
      if (created.length === 0) continue;
      summary.notifications += created.length;
      const items: DigestItem[] = created.map((c) => ({
        title: c.title,
        detail: c.body ?? undefined,
        href: c.href ?? '/notifications',
      }));
      if (user.emailReminders && emailConfigured()) {
        const mail = renderReminderEmail({ siteUrl, items });
        if (await sendEmail({ to: user.email, ...mail })) summary.emails++;
      }
      if (user.pushReminders && pushConfigured()) {
        for (const c of created) {
          summary.pushes += await sendPushToUser(user.id, {
            title: c.title,
            body: c.body,
            href: c.href,
          });
        }
      }
    } catch (e) {
      summary.errors.push(`reminders ${user.id}: ${describe(e)}`);
    }
  }
  return summary;
}

/** One email per user per local day with what today holds. */
export async function sendDigests(
  now: Date,
  siteUrl: string,
  opts: { ignoreHour: boolean }
): Promise<CronSummary> {
  const summary = empty();
  if (!emailConfigured()) return summary;
  const users = await activeUsers();
  summary.users = users.length;
  for (const user of users) {
    if (!user.emailReminders) continue;
    const { send, todayKey } = digestDue(user, now, user.timeZone, opts.ignoreHour);
    if (!send) continue;
    try {
      const yesterdayKey = formatInTimeZone(subDays(now, 1), user.timeZone, 'yyyy-MM-dd');
      const dayStart = fromZonedTime(`${todayKey}T00:00:00`, user.timeZone);
      const dayEnd = addDays(dayStart, 1);
      const [dueToday, overdue, eventRows, recent] = await Promise.all([
        listTasks(user.id, { status: 'open', dueFrom: todayKey, dueTo: todayKey }),
        listTasks(user.id, { status: 'open', dueTo: yesterdayKey, onlyWithDueDate: true }),
        listEventsBetween(user.id, dayStart, dayEnd),
        listNotifications(user.id, { unreadOnly: true, limit: 20 }),
      ]);
      const since = subDays(now, 1);
      const mail = renderDigest({
        name: user.name ?? '',
        dateLabel: formatInTimeZone(now, user.timeZone, 'EEEE d MMMM'),
        siteUrl,
        reminders: recent
          .filter((n) => n.createdAt >= since)
          .map((n) => ({
            title: n.title,
            detail: n.body ?? undefined,
            href: n.href ?? '/notifications',
          })),
        dueToday: dueToday.map((t) => ({
          title: t.title,
          detail: t.segment.name,
          href: `/tasks?task=${t.id}`,
        })),
        overdue: overdue.map((t) => ({
          title: t.title,
          detail: `due ${t.dueDate}`,
          href: `/tasks?task=${t.id}`,
        })),
        events: expandEvents(eventRows, dayStart, dayEnd).map((item) => ({
          title: item.title,
          detail: item.allDay
            ? 'all day'
            : formatInTimeZone(new Date(item.start), user.timeZone, 'HH:mm'),
          href: `/calendar?date=${todayKey}`,
        })),
      });
      if (await sendEmail({ to: user.email, ...mail })) {
        summary.digests++;
        summary.emails++;
        await db
          .update(userPreferences)
          .set({ digestSentOn: todayKey })
          .where(eq(userPreferences.userId, user.id));
      }
    } catch (e) {
      summary.errors.push(`digest ${user.id}: ${describe(e)}`);
    }
  }
  return summary;
}

/** Read notifications and sent reminders older than ninety days. */
export async function pruneOld(
  now: Date
): Promise<Pick<CronSummary, 'prunedNotifications' | 'prunedReminders'>> {
  const cutoff = subDays(now, KEEP_DAYS);
  const gone = await db
    .delete(notifications)
    .where(and(isNotNull(notifications.readAt), lt(notifications.readAt, cutoff)))
    .returning({ id: notifications.id });
  const sent = await db
    .delete(reminders)
    .where(and(isNotNull(reminders.sentAt), lt(reminders.sentAt, cutoff)))
    .returning({ id: reminders.id });
  return { prunedNotifications: gone.length, prunedReminders: sent.length };
}

function merge(...parts: Array<Partial<CronSummary>>): CronSummary {
  const out = empty();
  for (const p of parts) {
    out.users = Math.max(out.users, p.users ?? 0);
    out.notifications += p.notifications ?? 0;
    out.emails += p.emails ?? 0;
    out.pushes += p.pushes ?? 0;
    out.digests += p.digests ?? 0;
    out.prunedNotifications += p.prunedNotifications ?? 0;
    out.prunedReminders += p.prunedReminders ?? 0;
    out.googleSynced += p.googleSynced ?? 0;
    out.errors.push(...(p.errors ?? []));
  }
  return out;
}

/** Pulls from and pushes to every connected Google calendar. */
export async function syncConnectedCalendars(): Promise<
  Pick<CronSummary, 'googleSynced' | 'errors'>
> {
  const out = { googleSynced: 0, errors: [] as string[] };
  const rows = await db
    .select({ userId: calendarConnections.userId })
    .from(calendarConnections)
    .where(eq(calendarConnections.status, 'connected'));
  for (const row of rows) {
    const result = await syncGoogle(row.userId);
    if (result.error) out.errors.push(`google ${row.userId}: ${result.error}`);
    else out.googleSynced++;
  }
  return out;
}

/** The once-a-day job (vercel.json): reminders, digests regardless of the hour, pruning. */
export async function runDaily(now: Date, siteUrl: string): Promise<CronSummary> {
  return merge(
    await processDueReminders(now, siteUrl),
    await sendDigests(now, siteUrl, { ignoreHour: true }),
    await pruneOld(now),
    await syncConnectedCalendars()
  );
}

/** For an external scheduler every 10 to 15 minutes: reminders close to their time, digests at the chosen hour. */
export async function runFrequent(now: Date, siteUrl: string): Promise<CronSummary> {
  return merge(
    await processDueReminders(now, siteUrl),
    await sendDigests(now, siteUrl, { ignoreHour: false }),
    await syncConnectedCalendars()
  );
}
