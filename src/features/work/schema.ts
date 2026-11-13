import { differenceInCalendarDays, parseISO } from 'date-fns';
import { z } from 'zod';
import { ACCENTS } from '@/features/life-segments/schema';

export const SHIFT_KINDS = ['work', 'on_call', 'off'] as const;
export type ShiftKind = (typeof SHIFT_KINDS)[number];
export const SHIFT_KIND_LABELS: Record<ShiftKind, string> = {
  work: 'Work',
  on_call: 'On call',
  off: 'Off',
};

export const LEAVE_KINDS = ['annual', 'sick', 'unpaid', 'other'] as const;
export type LeaveKind = (typeof LEAVE_KINDS)[number];
export const LEAVE_KIND_LABELS: Record<LeaveKind, string> = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  unpaid: 'Unpaid leave',
  other: 'Other leave',
};

export const LEAVE_STATUSES = ['planned', 'approved', 'taken'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];
export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  planned: 'Planned',
  approved: 'Approved',
  taken: 'Taken',
};

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.');
/** 'HH:MM' from a time input; the database also returns 'HH:MM:SS'. */
const timeKey = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use a time like 09:00.');

export const patternDayInput = z.object({
  kind: z.enum(SHIFT_KINDS),
  label: z.string().trim().max(60).optional(),
  start: timeKey.optional(),
  end: timeKey.optional(),
});
export type PatternDayInput = z.infer<typeof patternDayInput>;

/** The cycle builder submits its days as one JSON string in a hidden field. */
const cycleField = z.preprocess(
  (value) => {
    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        return undefined;
      }
    }
    if (!Array.isArray(parsed)) return parsed;
    return parsed.map((day) => {
      if (!day || typeof day !== 'object') return day;
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(day as Record<string, unknown>)) {
        if (v !== '' && v !== null && v !== undefined) clean[k] = v;
      }
      return clean;
    });
  },
  z
    .array(patternDayInput)
    .min(1, 'Add at least one day to the cycle.')
    .max(56, 'A cycle can have at most 56 days.')
);

export const patternInput = z.object({
  name: z.string().trim().min(1, 'Give the pattern a name.').max(120),
  anchorDate: dateKey,
  cycle: cycleField,
  accent: z.enum(ACCENTS).default('burgundy'),
  isActive: z.coerce.boolean().default(false),
  note: z.string().trim().max(2000).optional(),
});
export type PatternInput = z.infer<typeof patternInput>;

export const LAST_DAY_AFTER_FIRST = 'The last day must be on or after the first.';
export const REPEAT_UNTIL_AFTER_FIRST = 'Repeat until must be on or after the first day.';
export const LEAVE_END_AFTER_START = 'The end must be on or after the start.';

export const KIND_NAME_MAX = 40;
const kindName = z.string().trim().min(1, 'Name the kind.').max(KIND_NAME_MAX);

/** A kind of the user's own; `countsAs` decides the status of its days. */
export const shiftKindInput = z.object({
  name: kindName,
  countsAs: z.enum(SHIFT_KINDS).default('work'),
  accent: z.enum(ACCENTS).default('burgundy'),
});
export type ShiftKindInput = z.infer<typeof shiftKindInput>;

/** A built-in kind, or `kind:<id>` for one of the user's own. */
export const kindChoice = z
  .string()
  .regex(/^(work|on_call|off|kind:[0-9a-f-]{36})$/, 'Choose a kind.')
  .default('work');

/** How a manual shift comes back: not at all, or every so many weeks or months. */
export const SHIFT_REPEAT_UNITS = ['none', 'week', 'month'] as const;
export type ShiftRepeatUnit = (typeof SHIFT_REPEAT_UNITS)[number];
export const SHIFT_REPEAT_UNIT_LABELS: Record<ShiftRepeatUnit, string> = {
  none: 'Does not repeat',
  week: 'Weekly',
  month: 'Monthly',
};
export const SHIFT_REPEAT_MAX = 52;

/** "every week", "every 6 weeks", "every month"; '' for a one-off. */
export function repeatLabel(every: number, unit: 'week' | 'month'): string {
  if (every <= 0) return '';
  return every === 1 ? `every ${unit}` : `every ${every} ${unit}s`;
}

/** The most days a block can cover before its repeats would overlap. */
export function repeatSpanLimit(every: number, unit: 'week' | 'month'): number {
  return (unit === 'month' ? 28 : 7) * every;
}

/** Days in the block from `date` to `endDate` inclusive; 1 without an end. */
export function shiftSpanDays(date: string, endDate?: string | null): number {
  if (!endDate) return 1;
  return Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(date)) + 1);
}

export const shiftInput = z
  .object({
    date: dateKey,
    endDate: dateKey.optional(),
    kind: kindChoice,
    /** A kind to create on the spot; it replaces `kind`. */
    newKind: kindName.optional(),
    newKindCountsAs: z.enum(SHIFT_KINDS).default('work'),
    label: z.string().trim().max(60).optional(),
    startTime: timeKey.optional(),
    endTime: timeKey.optional(),
    repeatUnit: z.enum(SHIFT_REPEAT_UNITS).default('none'),
    repeatEvery: z.coerce.number().int().min(1).max(SHIFT_REPEAT_MAX).default(1),
    repeatUntil: dateKey.optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.startTime && !v.endTime) || (v.endTime && !v.startTime)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'Give both a start and an end, or neither.',
      });
    }
    if (v.endDate && v.endDate < v.date) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: LAST_DAY_AFTER_FIRST });
    }
    if (v.repeatUnit !== 'none') {
      const most = repeatSpanLimit(v.repeatEvery, v.repeatUnit);
      if (shiftSpanDays(v.date, v.endDate) > most) {
        const every = repeatLabel(v.repeatEvery, v.repeatUnit);
        ctx.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: `A shift that comes back ${every} can cover at most ${most} days.`,
        });
      }
      if (v.repeatUntil && v.repeatUntil < v.date) {
        ctx.addIssue({ code: 'custom', path: ['repeatUntil'], message: REPEAT_UNTIL_AFTER_FIRST });
      }
    }
  });
export type ShiftInput = z.infer<typeof shiftInput>;

export const leaveInput = z
  .object({
    kind: z.enum(LEAVE_KINDS).default('annual'),
    status: z.enum(LEAVE_STATUSES).default('planned'),
    startDate: dateKey,
    endDate: dateKey,
    note: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: LEAVE_END_AFTER_START });
export type LeaveInput = z.infer<typeof leaveInput>;

export const holidayInput = z.object({
  date: dateKey,
  name: z.string().trim().min(1, 'Name the holiday.').max(120),
});
export type HolidayInput = z.infer<typeof holidayInput>;

/** Ready-made cycles for the pattern builder. Weekday cycles expect a Monday anchor. */
export const CYCLE_PRESETS: Array<{ label: string; cycle: PatternDayInput[] }> = [
  {
    label: '2 on, 2 off',
    cycle: [{ kind: 'work' }, { kind: 'work' }, { kind: 'off' }, { kind: 'off' }],
  },
  {
    label: '4 on, 4 off',
    cycle: [
      { kind: 'work' },
      { kind: 'work' },
      { kind: 'work' },
      { kind: 'work' },
      { kind: 'off' },
      { kind: 'off' },
      { kind: 'off' },
      { kind: 'off' },
    ],
  },
  {
    label: 'Weekdays',
    cycle: [
      { kind: 'work' },
      { kind: 'work' },
      { kind: 'work' },
      { kind: 'work' },
      { kind: 'work' },
      { kind: 'off' },
      { kind: 'off' },
    ],
  },
];
