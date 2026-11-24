import {
  addDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  format,
  getDate,
  getDaysInMonth,
  parseISO,
} from 'date-fns';
import type { WeekStartsOn } from '@/lib/dates';

/** Index = JavaScript `Date#getDay()`: 0 is Sunday. */
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_LONG_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * When a routine comes round. Weekly routines run on their weekdays every
 * `interval` weeks, counted in calendar weeks from the week of `startsOn`.
 * Monthly routines run every `interval` months on the day of the month
 * `startsOn` falls on, or the last day of a shorter month. Nothing here
 * touches the database.
 */
export type RoutineSchedule = {
  frequency: 'weekly' | 'monthly';
  interval: number;
  /** 0 = Sunday … 6 = Saturday; weekly only. */
  daysOfWeek: number[];
  /** yyyy-MM-dd; needed for every-N-weeks and for monthly. */
  startsOn: string | null;
};

/** The choices offered in the form, each a frequency and an interval. */
export const REPEATS = {
  'weekly-1': { frequency: 'weekly', interval: 1, label: 'Every week' },
  'weekly-2': { frequency: 'weekly', interval: 2, label: 'Every 2 weeks' },
  'weekly-3': { frequency: 'weekly', interval: 3, label: 'Every 3 weeks' },
  'weekly-4': { frequency: 'weekly', interval: 4, label: 'Every 4 weeks' },
  'weekly-6': { frequency: 'weekly', interval: 6, label: 'Every 6 weeks' },
  'monthly-1': { frequency: 'monthly', interval: 1, label: 'Every month' },
  'monthly-2': { frequency: 'monthly', interval: 2, label: 'Every 2 months' },
  'monthly-3': { frequency: 'monthly', interval: 3, label: 'Every 3 months' },
  'monthly-6': { frequency: 'monthly', interval: 6, label: 'Every 6 months' },
  'monthly-12': { frequency: 'monthly', interval: 12, label: 'Every year' },
} as const satisfies Record<
  string,
  Omit<RoutineSchedule, 'daysOfWeek' | 'startsOn'> & { label: string }
>;
export type RepeatKey = keyof typeof REPEATS;
export const REPEAT_KEYS = Object.keys(REPEATS) as RepeatKey[];

export function repeatKeyOf(s: Pick<RoutineSchedule, 'frequency' | 'interval'>): RepeatKey {
  const key = `${s.frequency}-${s.interval}`;
  return (REPEAT_KEYS as string[]).includes(key) ? (key as RepeatKey) : 'weekly-1';
}

/** Every week on its weekdays needs no anchor; everything else counts from `startsOn`. */
export function needsAnchor(s: Pick<RoutineSchedule, 'frequency' | 'interval'>): boolean {
  return s.frequency === 'monthly' || s.interval > 1;
}

export function isDueOn(s: RoutineSchedule, dateKey: string, weekStartsOn: WeekStartsOn): boolean {
  const date = parseISO(dateKey);
  if (s.frequency === 'weekly') {
    if (!s.daysOfWeek.includes(date.getDay())) return false;
    if (s.interval <= 1 || !s.startsOn) return true;
    if (dateKey < s.startsOn) return false;
    const weeks = differenceInCalendarWeeks(date, parseISO(s.startsOn), { weekStartsOn });
    return weeks % s.interval === 0;
  }
  if (!s.startsOn || dateKey < s.startsOn) return false;
  const start = parseISO(s.startsOn);
  const months = differenceInCalendarMonths(date, start);
  if (months % Math.max(1, s.interval) !== 0) return false;
  return getDate(date) === Math.min(getDate(start), getDaysInMonth(date));
}

/** The first day on or after `fromKey` the routine runs, or null within a year. */
export function nextDueOn(
  s: RoutineSchedule,
  fromKey: string,
  weekStartsOn: WeekStartsOn,
  horizonDays = 400
): string | null {
  let day = parseISO(fromKey);
  for (let i = 0; i < horizonDays; i++) {
    const key = format(day, 'yyyy-MM-dd');
    if (isDueOn(s, key, weekStartsOn)) return key;
    day = addDays(day, 1);
  }
  return null;
}

const ordinal = (n: number) => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

/** "Every 2 weeks on Mon and Thu", "Every month on the 14th". */
export function describeSchedule(s: RoutineSchedule): string {
  const every = REPEATS[repeatKeyOf(s)].label;
  if (s.frequency === 'monthly') {
    return s.startsOn ? `${every} on the ${ordinal(getDate(parseISO(s.startsOn)))}` : every;
  }
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => s.daysOfWeek.includes(d));
  if (days.length === 7) return s.interval > 1 ? `${every}, every day` : 'Every day';
  if (days.length === 0) return every;
  const names = days.map((d) => DAY_LABELS[d]);
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  return `${every} on ${list}`;
}
