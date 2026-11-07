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
import interactionPlugin from '@fullcalendar/react/interaction';
import classicThemePlugin from '@fullcalendar/react/themes/classic';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Accent } from '@/lib/accents';
import { cn } from '@/lib/utils';
import type { TimeBlockItem } from '../expand';
import { formatMinutes, type MoveBlockInput } from '../schema';
import type { TimeEntryItem } from '../service';

import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';

export type TimeViewName = 'timeGridWeek' | 'timeGridDay';

const VIEWS: { name: TimeViewName; label: string }[] = [
  { name: 'timeGridWeek', label: 'Week' },
  { name: 'timeGridDay', label: 'Day' },
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

function blockToEvent(item: TimeBlockItem): EventInput {
  const colours = ACCENT_VARS[item.accent];
  return {
    id: `block:${item.id}`,
    title: item.recurring ? `↻ ${item.title}` : item.title,
    start: item.start,
    end: item.end,
    color: colours.bg,
    contrastColor: colours.fg,
    editable: !item.recurring,
    className: 'planner-block',
    extendedProps: { kind: 'block', sourceId: item.sourceId, recurring: item.recurring },
  };
}

function entryToEvent(item: TimeEntryItem): EventInput {
  return {
    id: `entry:${item.id}`,
    title: `${item.running ? '● ' : '✓ '}${item.note ?? 'Logged'} · ${formatMinutes(item.durationMinutes)}`,
    start: item.start,
    end: item.end,
    color: 'var(--blush)',
    contrastColor: 'var(--charcoal)',
    editable: false,
    className: 'planner-actual',
    extendedProps: { kind: 'entry', sourceId: item.id, recurring: false },
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

export function TimeView({
  blocks,
  entries,
  showActual,
  weekStartsOn,
  initialView,
  initialDate,
  onRangeChange,
  onCreate,
  onOpenBlock,
  onOpenEntry,
  onMove,
}: {
  blocks: TimeBlockItem[];
  entries: TimeEntryItem[];
  showActual: boolean;
  weekStartsOn: number;
  initialView: TimeViewName;
  /** yyyy-MM-dd the grid opens on. */
  initialDate: string;
  onRangeChange: (from: Date, to: Date, view: TimeViewName) => void;
  onCreate: (defaults: { start: Date; end: Date }) => void;
  onOpenBlock: (sourceId: string, recurring: boolean) => void;
  onOpenEntry: (id: string) => void;
  /** Resolves false when the move was rejected, so the drag is reverted. */
  onMove: (input: MoveBlockInput) => Promise<boolean>;
}) {
  const controller = useCalendarController();
  const [title, setTitle] = useState('');
  const [view, setView] = useState<TimeViewName>(initialView);

  function changeView(next: TimeViewName) {
    setView(next);
    controller.changeView(next);
  }

  function handleDatesSet(info: DatesSetInfo) {
    setTitle(info.view.title);
    onRangeChange(info.start, info.end, info.view.type as TimeViewName);
  }

  function handleSelect(info: DateSelectInfo) {
    if (info.allDay) return;
    onCreate({ start: info.start, end: info.end });
  }

  function handleEventClick(info: EventClickInfo) {
    info.jsEvent.preventDefault();
    const { kind, sourceId, recurring } = info.event.extendedProps as {
      kind: 'block' | 'entry';
      sourceId: string;
      recurring: boolean;
    };
    if (kind === 'block') onOpenBlock(sourceId, recurring);
    else onOpenEntry(sourceId);
  }

  async function handleMove(info: EventDropInfo | EventResizeDoneInfo) {
    const ev = info.event;
    const { sourceId } = ev.extendedProps as { sourceId: string };
    const start = ev.start;
    if (!start) return info.revert();
    const accepted = await onMove({
      id: sourceId,
      start: start.toISOString(),
      end: ev.end?.toISOString() ?? null,
    });
    if (!accepted) info.revert();
  }

  const events = [...blocks.map(blockToEvent), ...(showActual ? entries.map(entryToEvent) : [])];

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
        <div className="flex gap-1" role="tablist" aria-label="Time view">
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
          '[&_.planner-actual]:[border-style:dashed] [&_.planner-actual]:opacity-75 [&_div]:text-sm [&_div]:leading-snug'
        )}
      >
        <FullCalendar
          controller={controller}
          plugins={[timeGridPlugin, interactionPlugin, classicThemePlugin]}
          initialView={initialView}
          initialDate={initialDate}
          headerToolbar={false}
          height="auto"
          firstDay={weekStartsOn}
          events={events}
          datesSet={handleDatesSet}
          selectable
          selectMirror
          select={handleSelect}
          eventClick={handleEventClick}
          editable
          eventDrop={handleMove}
          eventResize={handleMove}
          nowIndicator
          allDaySlot={false}
          slotMinTime="05:00:00"
          slotMaxTime="23:00:00"
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        />
      </div>
    </div>
  );
}
