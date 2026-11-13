import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  parseISO,
} from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import type { PatternDay } from '@/db/schema/work';
import type { CalendarItem } from '@/features/calendar/expand';
import type { Accent } from '@/lib/accents';
import {
  SHIFT_KIND_LABELS,
  repeatLabel,
  shiftSpanDays,
  type LeaveKind,
  type LeaveStatus,
  type ShiftKind,
} from './schema';

/**
 * Availability is derived, never stored (instructions.md 8.18). Everything
 * here works on whole 'yyyy-MM-dd' dates and 'HH:MM' times, so no time zone
 * conversion is needed until a shift is placed on the Life Calendar.
 */

export type PatternSource = {
  id: string;
  name: string;
  /** Day 0 of the cycle. */
  anchorDate: string;
  cycle: PatternDay[];
  accent: Accent;
  isActive: boolean;
};

export type ShiftSource = {
  id: string;
  /** First day; `endDate` closes a block of days (null for one day). */
  date: string;
  endDate: string | null;
  /** 0 for a one-off; otherwise the block comes back every this many weeks or months until `repeatUntil`. */
  repeatEvery: number;
  repeatUnit: 'week' | 'month';
  repeatUntil: string | null;
  kind: ShiftKind;
  /** Name and colour of the user's own kind, when the shift has one. */
  kindName: string | null;
  kindAccent: Accent | null;
  label: string | null;
  startTime: string | null;
  endTime: string | null;
  patternId: string | null;
};

export type LeaveSource = {
  startDate: string;
  endDate: string;
  kind: LeaveKind;
  status: LeaveStatus;
};

export type HolidaySource = { date: string; name: string };

export type WorkSources = {
  patterns: PatternSource[];
  shifts: ShiftSource[];
  leave: LeaveSource[];
  holidays: HolidaySource[];
};

export type WorkDayStatus = 'working' | 'on_call' | 'off' | 'leave' | 'holiday';

export type WorkShift = {
  kind: ShiftKind;
  label: string;
  /** 'HH:MM' */
  start?: string;
  end?: string;
  source: 'pattern' | 'manual';
  patternId?: string;
  accent?: Accent;
  /** The `shifts` row behind a manual entry. */
  id?: string;
  /** A manual shift that comes back every so many weeks or months. */
  repeats?: boolean;
};

export type WorkDay = {
  date: string;
  status: WorkDayStatus;
  shifts: WorkShift[];
  leave?: { kind: LeaveKind; status: LeaveStatus };
  holiday?: { name: string };
};

export const WORK_STATUS_LABELS: Record<WorkDayStatus, string> = {
  working: 'Working',
  on_call: 'On call',
  off: 'Free',
  leave: 'Leave',
  holiday: 'Holiday',
};

const toKey = (d: Date) => format(d, 'yyyy-MM-dd');

/** Every 'yyyy-MM-dd' from `from` to `to` inclusive; empty when `to` is before `from`. */
export function dateKeysBetween(from: string, to: string): string[] {
  const start = parseISO(from);
  const count = differenceInCalendarDays(parseISO(to), start);
  if (count < 0) return [];
  return Array.from({ length: count + 1 }, (_, i) => toKey(addDays(start, i)));
}

const laterOf = (a: string, b: string) => (a > b ? a : b);
const earlierOf = (a: string, b: string) => (a < b ? a : b);

type ShiftSpan = Pick<
  ShiftSource,
  'date' | 'endDate' | 'repeatEvery' | 'repeatUnit' | 'repeatUntil'
>;

/**
 * The dates in [from, to] a manual shift covers: its block of days, and when
 * it repeats, that block again every `repeatEvery` weeks or months, never
 * past `repeatUntil`. A monthly shift keeps its day of the month, landing on
 * the last day of months that are too short.
 */
export function expandShift(shift: ShiftSpan, from: string, to: string): string[] {
  const length = shiftSpanDays(shift.date, shift.endDate);
  const lastDay = (startKey: string) => toKey(addDays(parseISO(startKey), length - 1));
  if (shift.repeatEvery <= 0) {
    return dateKeysBetween(laterOf(shift.date, from), earlierOf(lastDay(shift.date), to));
  }
  const last = shift.repeatUntil ? earlierOf(shift.repeatUntil, to) : to;
  const first = parseISO(shift.date);
  const monthly = shift.repeatUnit === 'month';
  const startOfBlock = (block: number) =>
    monthly
      ? addMonths(first, block * shift.repeatEvery)
      : addDays(first, block * 7 * shift.repeatEvery);
  // Jump close to the first block that can reach `from`, never past it.
  const reach = addDays(parseISO(from), -(length - 1));
  const behind = monthly
    ? Math.floor(differenceInCalendarMonths(reach, first) / shift.repeatEvery) - 1
    : Math.ceil(differenceInCalendarDays(reach, first) / (7 * shift.repeatEvery));
  let block = Math.max(0, behind);
  const dates: string[] = [];
  for (;;) {
    const start = toKey(startOfBlock(block));
    if (start > last) break;
    dates.push(...dateKeysBetween(laterOf(start, from), earlierOf(lastDay(start), last)));
    block += 1;
  }
  return dates;
}

/** "3 days · every 2 weeks · until 20 May"; null for a plain single day. */
export function describeShift(shift: ShiftSpan): string | null {
  const parts: string[] = [];
  const length = shiftSpanDays(shift.date, shift.endDate);
  if (length > 1) parts.push(`${length} days`);
  const every = repeatLabel(shift.repeatEvery, shift.repeatUnit);
  if (every) parts.push(every);
  if (shift.repeatEvery > 0 && shift.repeatUntil) {
    const sameYear = shift.repeatUntil.slice(0, 4) === shift.date.slice(0, 4);
    parts.push(`until ${format(parseISO(shift.repeatUntil), sameYear ? 'd MMM' : 'd MMM yyyy')}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Position of `date` in a cycle of `length` days anchored on `anchorDate`; positive even before the anchor. */
export function cycleIndex(anchorDate: string, date: string, length: number): number {
  const offset = differenceInCalendarDays(parseISO(date), parseISO(anchorDate));
  return ((offset % length) + length) % length;
}

/** 'HH:MM:SS' from the database and 'HH:MM' from forms both become 'HH:MM'. */
export function normaliseTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 5);
}

/** The cycle day that falls on each date of the range. */
export function expandPattern(
  pattern: Pick<PatternSource, 'anchorDate' | 'cycle'>,
  from: string,
  to: string
): Array<{ date: string; index: number; day: PatternDay }> {
  const length = pattern.cycle.length;
  if (length === 0) return [];
  return dateKeysBetween(from, to).map((date) => {
    const index = cycleIndex(pattern.anchorDate, date, length);
    return { date, index, day: pattern.cycle[index] };
  });
}

function statusOf(shifts: WorkShift[]): WorkDayStatus {
  if (shifts.some((s) => s.kind === 'work')) return 'working';
  if (shifts.some((s) => s.kind === 'on_call')) return 'on_call';
  return 'off';
}

/**
 * One entry per date in [from, to]. Precedence per date: a public holiday,
 * then any leave period covering it (whatever its status), then manual
 * `shifts` covering it (which replace the pattern for that date; an `off`
 * row is a day off; a shift placed on the day itself beats one that repeats
 * onto it), otherwise the active patterns overlaid.
 */
export function deriveWorkDays(sources: WorkSources, from: string, to: string): WorkDay[] {
  const holidays = new Map(sources.holidays.map((h) => [h.date, h]));
  const placed = new Map<string, ShiftSource[]>();
  const repeating = new Map<string, ShiftSource[]>();
  for (const s of sources.shifts) {
    const into = s.repeatEvery > 0 ? repeating : placed;
    for (const date of expandShift(s, from, to)) {
      const list = into.get(date) ?? [];
      list.push(s);
      into.set(date, list);
    }
  }
  const patterns = sources.patterns.filter((p) => p.isActive && p.cycle.length > 0);
  const expanded = patterns.map((p) => ({
    pattern: p,
    byDate: new Map(expandPattern(p, from, to).map((e) => [e.date, e.day])),
  }));

  return dateKeysBetween(from, to).map((date) => {
    const holiday = holidays.get(date);
    if (holiday) return { date, status: 'holiday', shifts: [], holiday: { name: holiday.name } };

    const leave = sources.leave.find((l) => l.startDate <= date && l.endDate >= date);
    if (leave) {
      return {
        date,
        status: 'leave',
        shifts: [],
        leave: { kind: leave.kind, status: leave.status },
      };
    }

    const rows = placed.get(date) ?? repeating.get(date);
    if (rows && rows.length > 0) {
      const shifts: WorkShift[] = rows.map((r) => ({
        kind: r.kind,
        label: r.label?.trim() || r.kindName || SHIFT_KIND_LABELS[r.kind],
        start: normaliseTime(r.startTime),
        end: normaliseTime(r.endTime),
        source: 'manual',
        patternId: r.patternId ?? undefined,
        id: r.id,
        ...(r.kindAccent ? { accent: r.kindAccent } : {}),
        ...(r.repeatEvery > 0 ? { repeats: true } : {}),
      }));
      return { date, status: statusOf(shifts), shifts };
    }

    const shifts: WorkShift[] = [];
    for (const { pattern, byDate } of expanded) {
      const day = byDate.get(date);
      if (!day || day.kind === 'off') continue;
      shifts.push({
        kind: day.kind,
        label: day.label?.trim() || SHIFT_KIND_LABELS[day.kind],
        start: normaliseTime(day.start),
        end: normaliseTime(day.end),
        source: 'pattern',
        patternId: pattern.id,
        accent: pattern.accent,
      });
    }
    return { date, status: statusOf(shifts), shifts };
  });
}

/** "2 on, 2 off" style summary of a cycle. */
export function describeCycle(cycle: PatternDay[]): string {
  if (cycle.length === 0) return 'No days yet';
  const word: Record<ShiftKind, string> = { work: 'on', on_call: 'on call', off: 'off' };
  const runs: string[] = [];
  let i = 0;
  while (i < cycle.length) {
    let j = i;
    while (j < cycle.length && cycle[j].kind === cycle[i].kind) j++;
    runs.push(`${j - i} ${word[cycle[i].kind]}`);
    i = j;
  }
  return runs.join(', ');
}

/**
 * Shifts as read-only Life Calendar items. Timed shifts become instants in
 * the user's zone (an end at or before the start rolls to the next day);
 * shifts without times are all-day chips. Days off produce nothing.
 */
export function shiftCalendarItems(
  days: WorkDay[],
  timeZone: string,
  segmentId: string | null
): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const day of days) {
    day.shifts.forEach((shift, i) => {
      if (shift.kind === 'off') return;
      const base = {
        id: `shift:${day.date}:${i}`,
        sourceId: day.date,
        type: 'shift' as const,
        title: shift.kind === 'on_call' ? `${shift.label} (on call)` : shift.label,
        accent: shift.accent ?? ('burgundy' as Accent),
        calendarId: null,
        segmentId,
        recurring: shift.source === 'pattern' || shift.repeats === true,
      };
      if (shift.start && shift.end) {
        const start = fromZonedTime(`${day.date}T${shift.start}:00`, timeZone);
        let end = fromZonedTime(`${day.date}T${shift.end}:00`, timeZone);
        if (end <= start)
          end = fromZonedTime(`${toKey(addDays(parseISO(day.date), 1))}T${shift.end}:00`, timeZone);
        items.push({ ...base, allDay: false, start: start.toISOString(), end: end.toISOString() });
      } else {
        items.push({ ...base, allDay: true, start: day.date, end: null });
      }
    });
  }
  return items;
}
