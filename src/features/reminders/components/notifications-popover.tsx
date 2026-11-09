'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BellIcon, CheckIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { markAllNotificationsRead, markNotificationRead } from '../actions';

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  /** ISO instant, serialisable across the server boundary. */
  createdAt: string;
};

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const result = await markAllNotificationsRead();
          if (result.ok) router.refresh();
        })
      }
    >
      Mark all read
    </Button>
  );
}

export function NotificationRow({ item, compact }: { item: NotificationItem; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const age = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
  const markRead = () =>
    start(async () => {
      const result = await markNotificationRead(item.id);
      if (result.ok) router.refresh();
    });
  const content = (
    <>
      <span className={cn('block truncate', !item.read && 'font-medium')}>{item.title}</span>
      {item.body && (
        <span className="text-muted-foreground block truncate text-xs">{item.body}</span>
      )}
      <span className="text-muted-foreground block text-[11px]">{age}</span>
    </>
  );
  return (
    <li
      className={cn(
        'flex items-start gap-2 rounded-lg px-2 py-1.5',
        !item.read && 'bg-secondary/60',
        compact ? 'text-sm' : 'text-sm sm:text-base'
      )}
    >
      {!item.read && (
        <span aria-hidden className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
      )}
      <div className="min-w-0 flex-1">
        {item.href ? (
          <Link href={item.href} onClick={() => !item.read && markRead()} className="block">
            {content}
          </Link>
        ) : (
          <div>{content}</div>
        )}
      </div>
      {!item.read && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`Mark “${item.title}” as read`}
          disabled={pending}
          onClick={markRead}
        >
          <CheckIcon />
        </Button>
      )}
    </li>
  );
}

export function NotificationsPopover({
  items,
  unread,
}: {
  items: NotificationItem[];
  unread: number;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            className="relative"
          />
        }
      >
        <BellIcon />
        {unread > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-2 p-2">
        <div className="flex items-center justify-between px-1">
          <p className="font-heading text-base">Notifications</p>
          <MarkAllReadButton disabled={unread === 0} />
        </div>
        {items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-center text-sm">
            Nothing to show. Reminders you set on tasks and events appear here when due.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
            {items.map((item) => (
              <NotificationRow key={item.id} item={item} compact />
            ))}
          </ul>
        )}
        <Link
          href="/notifications"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}
        >
          All notifications
        </Link>
      </PopoverContent>
    </Popover>
  );
}
