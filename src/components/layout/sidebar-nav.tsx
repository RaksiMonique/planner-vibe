'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CURRENT_RELEASE, navGroups } from './nav-config';

export function SidebarNav({
  onNavigate,
  enabledModules,
}: {
  onNavigate?: () => void;
  enabledModules?: Partial<Record<string, boolean>>;
}) {
  const pathname = usePathname();
  const isEnabled = (item: { module?: string }) =>
    !item.module || enabledModules?.[item.module] !== false;
  const groups = navGroups
    .map((group) => ({ ...group, items: group.items.filter(isEnabled) }))
    .filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Primary" className="flex flex-col gap-5 px-3 py-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="tracking-eyebrow text-muted-foreground mb-1 px-3 text-[11px] font-medium uppercase">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const ready = item.release <= CURRENT_RELEASE;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const base =
                'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors';
              if (!ready) {
                return (
                  <li key={item.href}>
                    <span
                      aria-disabled="true"
                      title={`Arrives in Release ${item.release}`}
                      className={cn(base, 'text-muted-foreground/80 cursor-default')}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                      <span className="bg-muted text-muted-foreground ml-auto rounded-full px-1.5 text-[10px] font-medium">
                        R{item.release}
                      </span>
                    </span>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      base,
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
