'use client';

import Link from 'next/link';
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
 * opens the matching page with its form already showing.
 */
export function NewMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="default" size="sm" aria-label="New task or event" />}
      >
        <PlusIcon data-icon="inline-start" />
        <span className="hidden sm:inline">New</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem render={<Link href="/tasks?new=1" />}>
          <ListPlusIcon aria-hidden />
          Task
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/calendar?new=1" />}>
          <CalendarPlusIcon aria-hidden />
          Event
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
