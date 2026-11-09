'use client';

import { useState } from 'react';
import { MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SidebarNav } from './sidebar-nav';

export function MobileNav({
  enabledModules,
}: {
  enabledModules?: Partial<Record<string, boolean>>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" />}
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle className="font-heading text-primary text-lg">Life Planner</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <SidebarNav onNavigate={() => setOpen(false)} enabledModules={enabledModules} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
