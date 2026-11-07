'use client';

import { usePathname } from 'next/navigation';
import { navGroups } from './nav-config';

const EXTRA: Record<string, string> = {
  '/settings/data': 'Data',
};

/** Header title derived from the current route; pages add their own PageHeader below. */
export function RouteTitle({ fallback = 'Planner' }: { fallback?: string }) {
  const pathname = usePathname();
  const exact = EXTRA[pathname];
  const item = navGroups
    .flatMap((g) => g.items)
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return <h1 className="font-heading text-xl">{exact ?? item?.label ?? fallback}</h1>;
}
