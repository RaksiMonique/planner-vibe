import Link from 'next/link';
import { LogOutIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { signOut } from '@/features/auth/actions';
import { cn } from '@/lib/utils';
import { MobileNav } from './mobile-nav';
import { RouteTitle } from './route-title';
import { SidebarNav } from './sidebar-nav';

export type ShellUser = { email: string };

export function AppShell({
  user,
  title,
  enabledModules,
  children,
}: {
  /** null renders the public preview variant (no session). */
  user: ShellUser | null;
  /** Fixed title; otherwise derived from the route. */
  title?: string;
  enabledModules?: Partial<Record<string, boolean>>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="border-sidebar-border bg-sidebar hidden w-64 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-16 items-center px-6">
          <Link href={user ? '/dashboard' : '/'} className="font-heading text-primary text-xl">
            Life Planner
          </Link>
        </div>
        <ScrollArea className="flex-1">
          <SidebarNav enabledModules={enabledModules} />
        </ScrollArea>
        <div className="border-sidebar-border text-muted-foreground border-t p-4 text-xs">
          {user ? (
            <p className="truncate" title={user.email}>
              {user.email}
            </p>
          ) : (
            <p>Preview with sample data</p>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-card/70 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6 lg:px-8">
          <MobileNav enabledModules={enabledModules} />
          {title ? <h1 className="font-heading text-xl">{title}</h1> : <RouteTitle />}
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  <LogOutIcon data-icon="inline-start" />
                  Sign out
                </Button>
              </form>
            ) : (
              <>
                <Badge variant="secondary">Wireframe</Badge>
                <Link href="/auth/login" className={cn(buttonVariants({ size: 'sm' }))}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
