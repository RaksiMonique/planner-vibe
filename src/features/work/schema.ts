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

export const shiftInput = z
  .object({
    date: dateKey,
    kind: z.enum(SHIFT_KINDS).default('work'),
    label: z.string().trim().max(60).optional(),
    startTime: timeKey.optional(),
    endTime: timeKey.optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .refine((v) => !(v.startTime && !v.endTime) && !(v.endTime && !v.startTime), {
    path: ['endTime'],
    message: 'Give both a start and an end, or neither.',
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
  .refine((v) => v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'The end must be on or after the start.',
  });
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
