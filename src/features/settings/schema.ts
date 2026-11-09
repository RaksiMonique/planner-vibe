import { z } from 'zod';
import { MODULE_KEYS } from '@/db/schema';

export const profileInput = z.object({
  displayName: z.string().trim().max(80).optional(),
});

export const TIME_ZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC', 'America/Jamaica'];
  }
})();

export const WEEK_START_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '0', label: 'Sunday' },
  { value: '6', label: 'Saturday' },
] as const;

export const preferencesInput = z.object({
  timeZone: z.string().refine((tz) => TIME_ZONES.includes(tz), 'Choose a time zone from the list.'),
  weekStartsOn: z.coerce.number().int().min(0).max(6),
});

/** Switches arrive as `module:<key>` = 'on'; missing keys are off. */
export function modulesFromForm(values: Record<string, unknown>) {
  return Object.fromEntries(
    MODULE_KEYS.map((key) => [key, values[`module:${key}`] === true])
  ) as Record<(typeof MODULE_KEYS)[number], boolean>;
}

export const MODULE_LABELS: Record<(typeof MODULE_KEYS)[number], string> = {
  planning: 'Planning (calendar, tasks)',
  'life-segments': 'Life Segments, goals and projects',
  faith: 'Faith',
  study: 'Study planner',
  wellness: 'Wellness and self-care',
  habits: 'Habits',
  routines: 'Routines',
  time: 'Time blocking',
  journal: 'Journal and gratitude',
  reviews: 'Reviews',
  meals: 'Meals and groceries',
  media: 'Media tracker',
  gifts: 'Gifts',
  'vision-boards': 'Vision boards',
  work: 'Work and job calendar',
  notes: 'Notes and quotes',
  'important-info': 'Important information',
  finance: 'Financial snapshot',
  'cycle-tracking': 'Cycle tracking (private, off by default)',
};

export const deleteInput = z.object({
  confirm: z.literal('DELETE', { error: 'Type DELETE to confirm.' }),
});
