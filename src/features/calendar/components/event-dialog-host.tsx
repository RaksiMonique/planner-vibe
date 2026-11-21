'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadEventDialogAction } from '../actions';
import { categoryChoices } from '../categories';
import { EventDialog, type CalendarOption, type SegmentOption } from './event-dialog';

type Pickers = { calendars: CalendarOption[]; segments: SegmentOption[]; categories: string[] };

/**
 * Opens the new-event dialog over whatever page is showing when the address
 * carries `?new=event`. The calendar page handles that itself. Closing the
 * dialog removes the parameter, so the page stays where it was.
 */
export function EventDialogHost() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const active = pathname !== '/calendar' && params.get('new') === 'event';
  const [pickers, setPickers] = useState<Pickers | null>(null);

  useEffect(() => {
    if (!active || pickers) return;
    let cancelled = false;
    void loadEventDialogAction().then((result) => {
      if (cancelled || !result.ok) return;
      setPickers({
        calendars: result.data.calendars,
        segments: result.data.segments,
        categories: categoryChoices(result.data.customCategories),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [active, pickers]);

  function close() {
    const next = new URLSearchParams(params.toString());
    next.delete('new');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  if (!active || !pickers) return null;
  return (
    <EventDialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      values={{}}
      calendars={pickers.calendars}
      segments={pickers.segments}
      categories={pickers.categories}
      onSaved={() => {
        close();
        router.refresh();
      }}
    />
  );
}
