import { countUnreadNotifications, listNotifications } from '../queries';
import { generateDueNotifications } from '../service';
import { NotificationsPopover, type NotificationItem } from './notifications-popover';

/**
 * Header bell. Generating due notifications here means every page load
 * delivers reminders without a scheduler (Release 6 adds email and push).
 */
export async function NotificationsBell({ userId }: { userId: string }) {
  let items: NotificationItem[] = [];
  let unread = 0;
  try {
    await generateDueNotifications(userId);
    const [rows, count] = await Promise.all([
      listNotifications(userId, { limit: 10 }),
      countUnreadNotifications(userId),
    ]);
    items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      href: r.href,
      read: r.readAt !== null,
      createdAt: r.createdAt.toISOString(),
    }));
    unread = count;
  } catch (e) {
    // The shell must render even if the reminders tables are unreachable.
    console.error('[notifications] failed to load', e);
  }
  return <NotificationsPopover items={items} unread={unread} />;
}
