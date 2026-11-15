import { RRule, type Options } from 'rrule';
import {
  DEFAULT_RECURRENCE,
  WEEKDAY_CODES,
  type RecurrenceFields,
  type WeekdayCode,
} from '@/features/calendar/recurrence';
import type { RecurrencePreset } from '@/features/calendar/schema';

/**
 * Task repeats share the calendar's fields (every N days, weeks, months or
 * years; weekdays; same day or weekday of the month; an end). Tasks work on
 * whole dates, so the rule runs in floating UTC time anchored on the due
 * date, and completing an occurrence creates the next one.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** 'yyyy-MM-dd' → that calendar date at 00:00 UTC (rrule works in floating UTC time). */
export function dateKeyToUtc(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function utcToDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const FREQ: Record<Exclude<RecurrencePreset, 'none'>, number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
};
const codeOf = (utcDay: number): WeekdayCode => WEEKDAY_CODES[(utcDay + 6) % 7];

/** The stored rule (DTSTART + RRULE lines) for the fields, anchored on the due date. */
export function buildTaskRrule(fields: RecurrenceFields, dueDateKey: string): string | null {
  if (fields.recurrence === 'none') return null;
  const dtstart = dateKeyToUtc(dueDateKey);
  const options: Partial<Options> = {
    freq: FREQ[fields.recurrence],
    dtstart,
    interval: Math.max(1, fields.recurrenceInterval),
  };
  if (fields.recurrence === 'weekly') {
    const days =
      fields.recurrenceDays.length > 0 ? fields.recurrenceDays : [codeOf(dtstart.getUTCDay())];
    options.byweekday = days.map((c) => RRule[c]);
  }
  if (fields.recurrence === 'monthly') {
    if (fields.recurrenceMonthly === 'weekday') {
      const nth = Math.ceil(dtstart.getUTCDate() / 7);
      options.byweekday = [RRule[codeOf(dtstart.getUTCDay())].nth(nth >= 5 ? -1 : nth)];
    } else {
      options.bymonthday = [dtstart.getUTCDate()];
    }
  }
  if (fields.recurrenceEnd === 'until' && fields.recurrenceUntil) {
    options.until = dateKeyToUtc(fields.recurrenceUntil);
  }
  if (fields.recurrenceEnd === 'count' && fields.recurrenceCount) {
    options.count = fields.recurrenceCount;
  }
  return new RRule(options).toString();
}

/** The fields behind a stored rule, for the edit form. */
export function fieldsFromRrule(rrule: string | null | undefined): RecurrenceFields {
  if (!rrule) return { ...DEFAULT_RECURRENCE };
  try {
    const { freq, interval, byweekday, until, count } = RRule.fromString(rrule).origOptions;
    const recurrence = (Object.keys(FREQ) as Array<keyof typeof FREQ>).find(
      (k) => FREQ[k] === freq
    );
    if (!recurrence) return { ...DEFAULT_RECURRENCE };
    const raw = Array.isArray(byweekday) ? byweekday : byweekday ? [byweekday] : [];
    // rrule accepts a number, a code such as 'MO', or a Weekday with an optional position.
    const days = raw.map((d) =>
      typeof d === 'number'
        ? { index: d, position: 0 }
        : typeof d === 'string'
          ? { index: WEEKDAY_CODES.indexOf(d as WeekdayCode), position: 0 }
          : { index: d.weekday, position: d.n ?? 0 }
    );
    const positioned = days.some((d) => d.position !== 0);
    return {
      recurrence,
      recurrenceInterval: interval ?? 1,
      recurrenceDays: recurrence === 'weekly' ? days.map((d) => WEEKDAY_CODES[d.index]) : [],
      recurrenceMonthly: recurrence === 'monthly' && positioned ? 'weekday' : 'day',
      recurrenceEnd: until ? 'until' : count ? 'count' : 'never',
      recurrenceUntil: until ? utcToDateKey(until) : undefined,
      recurrenceCount: count ?? undefined,
    };
  } catch {
    return { ...DEFAULT_RECURRENCE };
  }
}

/** The first occurrence strictly after `afterKey`, as 'yyyy-MM-dd', or null when the rule ends. */
export function nextOccurrence(rrule: string, afterKey: string): string | null {
  const rule = RRule.fromString(rrule);
  const next = rule.after(dateKeyToUtc(afterKey), false);
  return next ? utcToDateKey(next) : null;
}

export function describeRrule(rrule: string | null | undefined): string {
  if (!rrule) return 'Does not repeat';
  try {
    const text = RRule.fromString(rrule).toText();
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch {
    return 'Repeats';
  }
}
