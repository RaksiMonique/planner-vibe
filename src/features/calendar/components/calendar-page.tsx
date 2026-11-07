'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SegmentDot } from '@/components/shared/segment-badge';
import { cn } from '@/lib/utils';
import { getCalendarItems, loadEvent, moveEventAction } from '../actions';
import type { CalendarItem } from '../expand';
import type { MoveInput } from '../schema';
import type { CalendarViewName } from './calendar-view';
import {
  EventDialog,
  type CalendarOption,
  type EventDialogValues,
  type SegmentOption,
} from './event-dialog';

// FullCalendar measures the DOM, so it only renders on the client.
const CalendarView = dynamic(() => import('./calendar-view').then((m) => m.CalendarView), {
  ssr: false,
  loading: () => <div className="bg-card h-[60vh] animate-pulse rounded-xl border" />,
});

type Range = { from: string; to: string; items: CalendarItem[] };

const pad = (n: number) => String(n).padStart(2, '0');
const localDateTime = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const localDate = (d: Date) => localDateTime(d).slice(0, 10);

export function CalendarPage({
  calendars,
  segments,
  initialRange,
  weekStartsOn,
  openNew,
  capture,
}: {
  calendars: (CalendarOption & { isEnabled: boolean })[];
  segments: SegmentOption[];
  initialRange: Range;
  weekStartsOn: number;
  openNew: boolean;
  capture: { id: string; text: string } | null;
}) {
  const router = useRouter();
  const [ranges, setRanges] = useState<Range[]>([initialRange]);
  const [current, setCurrent] = useState<{ from: Date; to: Date } | null>(null);
  const [enabledCalendars, setEnabledCalendars] = useState<Set<string>>(
    () => new Set(calendars.filter((c) => c.isEnabled).map((c) => c.id))
  );
  const [segmentId, setSegmentId] = useState<string>('all');
  const [showTasks, setShowTasks] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; values: EventDialogValues }>(() => ({
    open: openNew || !!capture,
    values: capture ? { title: capture.text, captureId: capture.id } : {},
  }));
  const [initialView] = useState<CalendarViewName>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'listWeek' : 'dayGridMonth'
  );
  const loading = useRef(new Set<string>());

  const loadRange = useCallback(
    async (from: Date, to: Date, force = false) => {
      const key = `${from.toISOString()}|${to.toISOString()}`;
      if (!force) {
        const covered = ranges.some((r) => new Date(r.from) <= from && new Date(r.to) >= to);
        if (covered || loading.current.has(key)) return;
      }
      loading.current.add(key);
      const result = await getCalendarItems(from.toISOString(), to.toISOString());
      loading.current.delete(key);
      if (!result.ok) return;
      setRanges((prev) => [
        ...prev.filter((r) => !(r.from === from.toISOString() && r.to === to.toISOString())),
        { from: from.toISOString(), to: to.toISOString(), items: result.data },
      ]);
    },
    [ranges]
  );

  const handleRangeChange = useCallback(
    (from: Date, to: Date) => {
      setCurrent({ from, to });
      void loadRange(from, to);
    },
    [loadRange]
  );

  const refresh = useCallback(() => {
    if (!current) return;
    setRanges([]);
    void loadRange(current.from, current.to, true);
  }, [current, loadRange]);

  // Strip the query parameters that opened the dialog once it has been used.
  useEffect(() => {
    if ((openNew || capture) && !dialog.open) router.replace('/calendar');
  }, [dialog.open, openNew, capture, router]);

  const items = useMemo(() => {
    if (!current) return initialRange.items;
    const range =
      ranges.find(
        (r) => r.from === current.from.toISOString() && r.to === current.to.toISOString()
      ) ?? ranges.find((r) => new Date(r.from) <= current.from && new Date(r.to) >= current.to);
    const all = range?.items ?? [];
    return all.filter((i) => {
      if (i.type === 'event' && i.calendarId && !enabledCalendars.has(i.calendarId)) return false;
      if (i.type === 'task' && !showTasks) return false;
      if (segmentId !== 'all' && i.segmentId && i.segmentId !== segmentId) return false;
      return true;
    });
  }, [current, ranges, initialRange.items, enabledCalendars, showTasks, segmentId]);

  function openNewEvent(defaults?: { allDay: boolean; start: Date; end: Date | null }) {
    const values: EventDialogValues = {};
    if (defaults) {
      values.isAllDay = defaults.allDay;
      if (defaults.allDay) values.allDayDate = localDate(defaults.start);
      else {
        values.startsAt = localDateTime(defaults.start);
        values.endsAt = localDateTime(
          defaults.end ?? new Date(defaults.start.getTime() + 60 * 60 * 1000)
        );
      }
    }
    setDialog({ open: true, values });
  }

  async function openExisting(sourceId: string) {
    const result = await loadEvent(sourceId);
    if (result.ok) setDialog({ open: true, values: result.data });
  }

  async function handleMove(input: MoveInput) {
    const result = await moveEventAction(input);
    if (result.ok) refresh();
    return result.ok;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" aria-label="Calendars">
          {calendars.map((c) => {
            const on = enabledCalendars.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setEnabledCalendars((prev) => {
                    const next = new Set(prev);
                    if (on) next.delete(c.id);
                    else next.add(c.id);
                    return next;
                  })
                }
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  on ? 'bg-card' : 'text-muted-foreground bg-transparent line-through opacity-70'
                )}
              >
                <SegmentDot accent={c.accent} />
                {c.name}
              </button>
            );
          })}
        </div>
        <Select
          value={segmentId}
          onValueChange={(v) => setSegmentId(v ?? 'all')}
          items={[
            { value: 'all', label: 'All segments' },
            ...segments.map((s) => ({ value: s.id, label: s.name })),
          ]}
        >
          <SelectTrigger size="sm" aria-label="Life Segment filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All segments</SelectItem>
            {segments.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <SegmentDot accent={s.accent} /> {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="show-tasks" size="sm" checked={showTasks} onCheckedChange={setShowTasks} />
          <Label htmlFor="show-tasks" className="text-xs">
            Show tasks
          </Label>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => openNewEvent()}>
          <PlusIcon data-icon="inline-start" />
          New event
        </Button>
      </div>

      <CalendarView
        items={items}
        weekStartsOn={weekStartsOn}
        initialView={initialView}
        onRangeChange={handleRangeChange}
        onCreate={openNewEvent}
        onOpenEvent={(id) => void openExisting(id)}
        onOpenTask={(id) => router.push(`/tasks?task=${id}`)}
        onMove={handleMove}
      />

      <EventDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        values={dialog.values}
        calendars={calendars}
        segments={segments}
        onSaved={() => {
          setDialog((d) => ({ ...d, open: false }));
          refresh();
        }}
      />
    </div>
  );
}
