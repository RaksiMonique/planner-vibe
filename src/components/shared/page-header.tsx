'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useEffect, useRef, useState } from 'react';
import { navGroups } from '@/components/layout/nav-config';
import { cn } from '@/lib/utils';

export type Crumb = { label: string; href: string };

const HOME: Crumb = { label: 'Today', href: '/dashboard' };
const NAV_ITEMS = navGroups.flatMap((g) => g.items);

/**
 * The sidebar page this path sits under, when it is not one itself: /goals/abc
 * sits under Goals, /study/courses/abc under Study planner.
 */
function parentFor(pathname: string): Crumb | undefined {
  const parents = NAV_ITEMS.filter(
    (item) => item.href !== HOME.href && pathname.startsWith(`${item.href}/`)
  ).sort((a, b) => b.href.length - a.href.length);
  const nearest = parents[0];
  return nearest ? { label: nearest.label, href: nearest.href } : undefined;
}

/**
 * Title block of every page. The line above the title is a trail of links:
 * Today, then the pages this one sits under, then any plain eyebrow text. The
 * action buttons follow the reader: once the header scrolls out of view they
 * sit in a small dock at the bottom right, so adding something never means
 * scrolling back to the top.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  crumbs,
  actions,
}: {
  title: string;
  description?: string;
  /** Plain text above the title, after any crumbs. */
  eyebrow?: string;
  /** Pages above this one, nearest last, in place of the sidebar-derived parent. */
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const parent = parentFor(pathname);
  const trail: Crumb[] =
    pathname === HOME.href ? [] : [HOME, ...(crumbs ?? (parent ? [parent] : []))];
  const ref = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !actions) return;
    const observer = new IntersectionObserver(([entry]) => setDocked(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [actions]);

  return (
    <>
      <div ref={ref} className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          {(trail.length > 0 || eyebrow) && (
            <nav
              aria-label="Breadcrumb"
              className="tracking-eyebrow text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs uppercase"
            >
              {trail.map((crumb, i) => (
                <Fragment key={crumb.href}>
                  <Link
                    href={crumb.href}
                    className="hover:text-primary underline-offset-4 hover:underline"
                  >
                    {crumb.label}
                  </Link>
                  {(eyebrow || i < trail.length - 1) && <span aria-hidden>›</span>}
                </Fragment>
              ))}
              {eyebrow && <span>{eyebrow}</span>}
            </nav>
          )}
          <h2 className="font-heading text-3xl">{title}</h2>
          {description && <p className="text-muted-foreground max-w-2xl text-sm">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {actions && (
        <div
          data-slot="action-dock"
          className={cn(
            'bg-background/95 fixed right-4 bottom-4 z-30 flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-end gap-2 rounded-xl border p-2 shadow-lg backdrop-blur sm:right-6 sm:bottom-6',
            !docked && 'hidden'
          )}
        >
          {actions}
        </div>
      )}
    </>
  );
}
