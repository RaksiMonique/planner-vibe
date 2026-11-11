'use client';

import { useState } from 'react';
import FullCalendar, { useCalendarController } from '@fullcalendar/react';
import type {
  DateSelectInfo,
  DatesSetInfo,
  EventClickInfo,
  EventDropInfo,
  EventInput,
  EventResizeDoneInfo,
} from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import interactionPlugin from '@fullcalendar/react/interaction';
import listPlugin from '@fullcalendar/react/list';
import classicThemePlugin from '@fullcalendar/react/themes/classic';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Accent } from '@/lib/accents';
import { cn } from '@/lib/utils';
import type { CalendarItem } from '../expand';
import type { MoveInput } from '../schema';

import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';

export type CalendarViewName = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

const VIEWS: { name: CalendarViewName; label: string }[] = [
  { name: 'dayGridMonth', label: 'Month' },
  { name: 'timeGridWeek', label: 'Week' },
  { name: 'timeGridDay', label: 'Day' },
  { name: 'listWeek', label: 'List' },
];

/** Palette variables per accent; FullCalendar writes these into inline styles. */
const ACCENT_VARS: Record<Accent, { bg: string; fg: string }> = {
  burgundy: { bg: 'var(--burgundy)', fg: 'var(--ivory)' },
  terracotta: { bg: 'var(--terracotta)', fg: 'var(--white)' },
  coral: { bg: 'var(--coral)', fg: 'var(--charcoal)' },
  peach: { bg: 'var(--peach)', fg: 'var(--charcoal)' },
  sage: { bg: 'var(--sage)', fg: 'var(--charcoal)' },
  beige: { bg: 'var(--beige)', fg: 'var(--charcoal)' },
};

export function toFullCalendarEvent(item: CalendarItem): EventInput {
  const colours =
    item.type === 'event' || item.type === 'shift' || item.type === 'external'
      ? ACCENT_VARS[item.accent]
      : item.type === 'task'
        ? { bg: 'var(--blush)', fg: 'var(--charcoal)' }
        : item.type === 'time_block'
          ? { bg: 'var(--ivory)', fg: 'var(--warm-grey)' }
          : { bg: 'var(--beige)', fg: 'var(--charcoal)' };
  return {
    id: item.id,
    title:
      item.type === 'milestone'
        ? `◆ ${item.title}`
        : item.type === 'task'
          ? `☐ ${item.title}`
          : item.type === 'time_block'
            ? `⏱ ${item.title}`
            : item.type === 'shift'
              ? `⚒ ${item.title}`
              : item.type === 'external'
                ? `↗ ${item.title}`
                : item.title,
    start: item.start,
    end: item.end ?? undefined,
    allDay: item.allDay,
    color: colours.bg,
    contrastColor: colours.fg,
    editable: item.type === 'event' && !item.recurring,
    className: `planner-${item.type}`,
    url: item.url ?? undefined,
    extendedProps: { type: item.type, sourceId: item.sourceId, recurring: item.recurring },
  };
}

// The classic theme reads these variables; mapping them to the design tokens
// keeps the grid inside the approved palette (instructions.md 2.1).
const THEME_VARS = [
  '[--fc-classic-background:var(--card)] [--fc-classic-faint:var(--ivory)] [--fc-classic-muted:var(--blush)]',
  '[--fc-classic-strong:var(--beige)] [--fc-classic-foreground:var(--charcoal)]',
  '[--fc-classic-faint-foreground:var(--beige)] [--fc-classic-muted-foreground:var(--warm-grey)]',
  '[--fc-classic-border:var(--border)] [--fc-classic-strong-border:var(--beige)]',
  '[--fc-classic-primary:var(--burgundy)] [--fc-classic-primary-foreground:var(--ivory)]',
  '[--fc-classic-event:var(--burgundy)] [--fc-classic-event-contrast:var(--ivory)]',
  '[--fc-classic-highlight:var(--peach)] [--fc-classic-today:var(--blush)] [--fc-classic-now:var(--terracotta)]',
  '[--fc-classic-button:var(--card)] [--fc-classic-button-border:var(--border)] [--fc-classic-button-foreground:var(--charcoal)]',
  '[--fc-classic-button-strong:var(--burgundy)] [--fc-classic-button-strong-border:var(--burgundy)] [--fc-classic-button-outline:var(--burgundy)]',
].join(' ');

export function CalendarView({
  items,
  weekStartsOn,
  initialView,
  onRangeChange,
  onCreate,
  onOpenEvent,
  onOpenTask,
  onOpenTimeBlock,
  onOpenShift,
  onMove,
  initialDate,
}: {
  items: CalendarItem[];
  weekStartsOn: number;
  initialView: CalendarViewName;
  onRangeChange: (from: Date, to: Date) => void;
  onCreate: (defaults: { allDay: boolean; start: Date; end: Date | null }) => void;
  onOpenEvent: (sourceId: string, recurring: boolean) => void;
  onOpenTask: (id: string) => void;
  onOpenTimeBlock?: (id: string) => void;
  /** Shifts are read-only here; `dateKey` is the day clicked. */
  onOpenShift?: (dateKey: string) => void;
  /** yyyy-MM-dd to open on; defaults to today. */
  initialDate?: string;
  /** Resolves false when the move was rejected, so the drag is reverted. */
  onMove: (input: MoveInput) => Promise<boolean>;
}) {
  const controller = useCalendarController();
  const [title, setTitle] = useState('');
  const [view, setView] = useState<CalendarViewName>(initialView);

  function changeView(next: CalendarViewName) {
    setView(next);
    controller.changeView(next);
  }

  function handleDatesSet(info: DatesSetInfo) {
    setTitle(info.view.title);
    onRangeChange(info.start, info.end);
  }

  function handleSelect(info: DateSelectInfo) {
    onCreate({ allDay: info.allDay, start: info.start, end: info.allDay ? null : info.end });
  }

  function handleEventClick(info: EventClickInfo) {
    info.jsEvent.preventDefault();
    const { type, sourceId, recurring } = info.event.extendedProps as {
      type: CalendarItem['type'];
      sourceId: string;
      recurring: boolean;
    };
    if (type === 'task') onOpenTask(sourceId);
    else if (type === 'time_block') onOpenTimeBlock?.(sourceId);
    else if (type === 'shift') onOpenShift?.(sourceId);
    else if (type === 'external') {
      const url = info.event.url;
      if (url) window.open(url, '_blank', 'noopener');
    } else if (type === 'event') onOpenEvent(sourceId, recurring);
  }

  async function handleMove(info: EventDropInfo | EventResizeDoneInfo) {
    const ev = info.event;
    const { sourceId } = ev.extendedProps as { sourceId: string };
    const start = ev.start;
    if (!start) return info.revert();
    const accepted = await onMove({
      id: sourceId,
      allDay: ev.allDay,
      start: ev.allDay ? toDateKeyLocal(start) : start.toISOString(),
      end: ev.allDay ? null : (ev.end?.toISOString() ?? null),
    });
    if (!accepted) info.revert();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous"
            onClick={() => controller.prev()}
          >
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => controller.today()}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next"
            onClick={() => controller.next()}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <h3 className="font-heading min-w-0 flex-1 truncate text-lg">{title}</h3>
        <div className="flex gap-1" role="tablist" aria-label="Calendar view">
          {VIEWS.map((v) => (
            <Button
              key={v.name}
              role="tab"
              aria-selected={view === v.name}
              variant={view === v.name ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => changeView(v.name)}
            >
              {v.label}
            </Button>
          ))}
        </div>
      </div>
      <div
        className={cn(
          'bg-card overflow-hidden rounded-xl border p-2',
          THEME_VARS,
          '[&_.planner-task]:opacity-90 [&_div]:text-sm [&_div]:leading-snug'
        )}
      >
        <FullCalendar
          controller={controller}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
            classicThemePlugin,
          ]}
          initialView={initialView}
          initialDate={initialDate}
          headerToolbar={false}
          height="auto"
          firstDay={weekStartsOn}
          events={items.map(toFullCalendarEvent)}
          datesSet={handleDatesSet}
          selectable
          selectMirror
          select={handleSelect}
          eventClick={handleEventClick}
          editable
          eventDrop={handleMove}
          eventResize={handleMove}
          dayMaxEvents={4}
          nowIndicator
          scrollTime="06:00:00"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          noEventsText="Nothing scheduled."
        />
      </div>
    </div>
  );
}

function toDateKeyLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
