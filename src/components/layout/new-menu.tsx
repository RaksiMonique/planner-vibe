'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CalendarPlusIcon, ListPlusIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * The header's New button: a task or an event from any page. Each choice
 * opens its form over the current page by adding `?new=task` or
 * `?new=event` to the address, keeping the page's other parameters.
 */
export function NewMenu() {
  const pathname = usePathname();
  const params = useSearchParams();
  const hrefFor = (kind: 'task' | 'event') => {
    const next = new URLSearchParams(params.toString());
    for (const k of ['new', 'task', 'parent']) next.delete(k);
    next.set('new', kind);
    return `${pathname}?${next.toString()}`;
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="default" size="sm" aria-label="New task or event" />}
      >
        <PlusIcon data-icon="inline-start" />
        <span className="hidden sm:inline">New</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem render={<Link href={hrefFor('task')} />}>
          <ListPlusIcon aria-hidden />
          Task
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={hrefFor('event')} />}>
          <CalendarPlusIcon aria-hidden />
          Event
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
