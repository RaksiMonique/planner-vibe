import { differenceInCalendarDays, format, getDay, parseISO } from 'date-fns';
import type { RecurrencePreset } from './schema';

/**
 * Event repeats, richer than a frequency: every N days, weeks, months or
 * years; weekly on chosen weekdays; monthly on the same day or the same
 * weekday; ending never, on a date or after a count. The rule is stored as
 * an RRULE string that the `rrule` package expands. Nothing here touches the
 * database.
 */

export const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];
export const WEEKDAY_LABELS: Record<WeekdayCode, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
};

export const MONTHLY_MODES = ['day', 'weekday'] as const;
export type MonthlyMode = (typeof MONTHLY_MODES)[number];
export const RECURRENCE_ENDS = ['never', 'until', 'count'] as const;
export type RecurrenceEnd = (typeof RECURRENCE_ENDS)[number];

export type RecurrenceFields = {
  recurrence: RecurrencePreset;
  /** Every N units; 1 is every time. */
  recurrenceInterval: number;
  /** Weekly only: the user's local weekdays. Empty means the start's weekday. */
  recurrenceDays: WeekdayCode[];
  /** Monthly only: the same day of the month, or the same nth weekday. */
  recurrenceMonthly: MonthlyMode;
  recurrenceEnd: RecurrenceEnd;
  /** Local yyyy-MM-dd of the last day an occurrence may fall on. */
  recurrenceUntil?: string;
  recurrenceCount?: number;
};

export const DEFAULT_RECURRENCE: RecurrenceFields = {
  recurrence: 'none',
  recurrenceInterval: 1,
  recurrenceDays: [],
  recurrenceMonthly: 'day',
  recurrenceEnd: 'never',
};

const UNIT: Record<Exclude<RecurrencePreset, 'none'>, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
};
const ORDINAL = ['first', 'second', 'third', 'fourth', 'last'];

/** Weekday code of a local yyyy-MM-dd (or yyyy-MM-ddTHH:mm) key. */
export function weekdayOf(localKey: string): WeekdayCode {
  return WEEKDAY_CODES[(getDay(parseISO(localKey)) + 6) % 7];
}

/**
 * Days between the start's local calendar date and the UTC date of the same
 * instant: 0, 1 or -1. Rules run on UTC dates, so weekdays are shifted by
 * this when written and shifted back when read.
 */
export function utcDayShift(localDateKey: string, instant: Date): number {
  return differenceInCalendarDays(
    parseISO(instant.toISOString().slice(0, 10)),
    parseISO(localDateKey)
  );
}

const shiftCode = (code: WeekdayCode, shift: number): WeekdayCode =>
  WEEKDAY_CODES[(((WEEKDAY_CODES.indexOf(code) + shift) % 7) + 7) % 7];

/** "second Tuesday" style position of the UTC start inside its month. */
function nthWeekday(dtstart: Date): { nth: number; code: WeekdayCode } {
  const nth = Math.ceil(dtstart.getUTCDate() / 7);
  return { nth: nth >= 5 ? -1 : nth, code: WEEKDAY_CODES[(dtstart.getUTCDay() + 6) % 7] };
}

/** The RRULE string for the fields, or null for no repeat. UNTIL lives in its own column. */
export function buildRRule(
  fields: RecurrenceFields,
  ctx: { dtstart: Date; dayShift: number }
): string | null {
  if (fields.recurrence === 'none') return null;
  const parts = [`FREQ=${fields.recurrence.toUpperCase()}`];
  if (fields.recurrenceInterval > 1) parts.push(`INTERVAL=${fields.recurrenceInterval}`);
  if (fields.recurrence === 'weekly' && fields.recurrenceDays.length > 0) {
    const days = [...new Set(fields.recurrenceDays.map((c) => shiftCode(c, ctx.dayShift)))];
    parts.push(`BYDAY=${days.join(',')}`);
  }
  if (fields.recurrence === 'monthly' && fields.recurrenceMonthly === 'weekday') {
    const { nth, code } = nthWeekday(ctx.dtstart);
    parts.push(`BYDAY=${nth}${code}`);
  }
  if (fields.recurrenceEnd === 'count' && fields.recurrenceCount) {
    parts.push(`COUNT=${fields.recurrenceCount}`);
  }
  return parts.join(';');
}

/** The fields behind a stored rule; `until` is the local date from the until column. */
export function parseRRule(
  rrule: string | null | undefined,
  ctx: { dayShift: number; until?: string | null }
): RecurrenceFields {
  if (!rrule) return { ...DEFAULT_RECURRENCE };
  const get = (key: string) => new RegExp(`(?:^|;)${key}=([^;]+)`).exec(rrule)?.[1];
  const freq = (get('FREQ') ?? '').toLowerCase();
  const recurrence: RecurrencePreset =
    (['daily', 'weekly', 'monthly', 'yearly'] as const).find((f) => f === freq) ?? 'none';
  if (recurrence === 'none') return { ...DEFAULT_RECURRENCE };
  const byday = get('BYDAY')?.split(',') ?? [];
  const count = Number(get('COUNT'));
  const weekly = recurrence === 'weekly';
  return {
    recurrence,
    recurrenceInterval: Math.max(1, Number(get('INTERVAL')) || 1),
    recurrenceDays: weekly
      ? byday
          .filter((d): d is WeekdayCode => (WEEKDAY_CODES as readonly string[]).includes(d))
          .map((d) => shiftCode(d, -ctx.dayShift))
      : [],
    recurrenceMonthly:
      recurrence === 'monthly' && byday.some((d) => /^-?\d/.test(d)) ? 'weekday' : 'day',
    recurrenceEnd: ctx.until ? 'until' : count > 0 ? 'count' : 'never',
    recurrenceUntil: ctx.until ?? undefined,
    recurrenceCount: count > 0 ? count : undefined,
  };
}

/** "Every 2 weeks on Tue, Thu, until 30 Jun 2026"; '' for no repeat. */
export function describeRecurrence(fields: RecurrenceFields, startLocalKey: string): string {
  if (fields.recurrence === 'none') return '';
  const unit = UNIT[fields.recurrence];
  const n = fields.recurrenceInterval;
  let text = n > 1 ? `Every ${n} ${unit}s` : `Every ${unit}`;
  if (fields.recurrence === 'weekly') {
    const days =
      fields.recurrenceDays.length > 0 ? fields.recurrenceDays : [weekdayOf(startLocalKey)];
    text += ` on ${days.map((d) => WEEKDAY_LABELS[d]).join(', ')}`;
  }
  if (fields.recurrence === 'monthly') {
    const start = parseISO(startLocalKey);
    if (fields.recurrenceMonthly === 'weekday') {
      const nth = Math.min(Math.ceil(start.getDate() / 7), 5);
      text += ` on the ${ORDINAL[nth - 1]} ${format(start, 'EEEE')}`;
    } else {
      text += ` on day ${start.getDate()}`;
    }
  }
  if (fields.recurrenceEnd === 'until' && fields.recurrenceUntil) {
    text += `, until ${format(parseISO(fields.recurrenceUntil), 'd MMM yyyy')}`;
  } else if (fields.recurrenceEnd === 'count' && fields.recurrenceCount) {
    text += `, ${fields.recurrenceCount} ${fields.recurrenceCount === 1 ? 'time' : 'times'}`;
  }
  return text;
}
