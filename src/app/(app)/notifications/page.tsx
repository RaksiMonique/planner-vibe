import type { Metadata } from 'next';
import { BellIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import {
  MarkAllReadButton,
  NotificationRow,
} from '@/features/reminders/components/notifications-popover';
import { countUnreadNotifications, listNotifications } from '@/features/reminders/queries';
import { generateDueNotifications } from '@/features/reminders/service';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await requireUser();
  await generateDueNotifications(user.id);
  const [rows, unread] = await Promise.all([
    listNotifications(user.id, { limit: 200 }),
    countUnreadNotifications(user.id),
  ]);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Reminders you set on tasks, events and habits, delivered in the app when they fall due."
        actions={<MarkAllReadButton disabled={unread === 0} />}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={BellIcon}
          title="Nothing yet"
          description="Add a reminder from a task or event form and it will show up here when due."
        />
      ) : (
        <ul className="bg-card flex flex-col gap-1 rounded-xl border p-2">
          {rows.map((r) => (
            <NotificationRow
              key={r.id}
              item={{
                id: r.id,
                title: r.title,
                body: r.body,
                href: r.href,
                read: r.readAt !== null,
                createdAt: r.createdAt.toISOString(),
              }}
            />
          ))}
        </ul>
      )}
    </>
  );
}
