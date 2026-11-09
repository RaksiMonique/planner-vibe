import { RRule, Weekday } from 'rrule';

export const RECURRENCE_PRESETS = ['none', 'daily', 'weekdays', 'weekly', 'monthly'] as const;
export type RecurrencePreset = (typeof RECURRENCE_PRESETS)[number];

export const RECURRENCE_LABELS: Record<RecurrencePreset, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekdays: 'Every weekday',
  weekly: 'Every week',
  monthly: 'Every month',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** 'yyyy-MM-dd' → that calendar date at 00:00 UTC (rrule works in floating UTC time). */
export function dateKeyToUtc(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function utcToDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const WEEKDAYS = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];

/** Builds the stored rule string (DTSTART + RRULE lines) for a preset anchored on the due date. */
export function presetToRrule(preset: RecurrencePreset, dueDateKey: string): string | null {
  if (preset === 'none') return null;
  const dtstart = dateKeyToUtc(dueDateKey);
  // rrule weekday index: 0 = Monday … 6 = Sunday
  const weekday = new Weekday((dtstart.getUTCDay() + 6) % 7);
  const options = {
    daily: { freq: RRule.DAILY },
    weekdays: { freq: RRule.WEEKLY, byweekday: WEEKDAYS },
    weekly: { freq: RRule.WEEKLY, byweekday: [weekday] },
    monthly: { freq: RRule.MONTHLY, bymonthday: [dtstart.getUTCDate()] },
  }[preset];
  return new RRule({ ...options, dtstart }).toString();
}

/** Recognises the preset a stored rule came from, for the edit form. */
export function presetFromRrule(rrule: string | null | undefined): RecurrencePreset {
  if (!rrule) return 'none';
  try {
    const { freq, byweekday, bymonthday } = RRule.fromString(rrule).origOptions;
    if (freq === RRule.DAILY) return 'daily';
    if (freq === RRule.MONTHLY && bymonthday) return 'monthly';
    if (freq === RRule.WEEKLY) {
      const days = Array.isArray(byweekday) ? byweekday : byweekday ? [byweekday] : [];
      return days.length === 5 ? 'weekdays' : 'weekly';
    }
  } catch {
    // unreadable rule: treat as a one-off
  }
  return 'none';
}

/** The first occurrence strictly after `afterKey`, as 'yyyy-MM-dd', or null when the rule ends. */
export function nextOccurrence(rrule: string, afterKey: string): string | null {
  const rule = RRule.fromString(rrule);
  const next = rule.after(dateKeyToUtc(afterKey), false);
  return next ? utcToDateKey(next) : null;
}

export function describeRrule(rrule: string | null | undefined): string {
  if (!rrule) return RECURRENCE_LABELS.none;
  try {
    const text = RRule.fromString(rrule).toText();
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch {
    return 'Repeats';
  }
}
