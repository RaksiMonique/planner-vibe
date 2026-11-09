import { z } from 'zod';

export const WELLNESS_KINDS = [
  'sleep',
  'water',
  'skincare',
  'haircare',
  'treatment',
  'fitness',
  'self_care',
  'cycle',
] as const;
export type WellnessKind = (typeof WELLNESS_KINDS)[number];

export const WELLNESS_KIND_LABELS: Record<WellnessKind, string> = {
  sleep: 'Sleep',
  water: 'Water',
  skincare: 'Skincare',
  haircare: 'Haircare',
  treatment: 'Treatment',
  fitness: 'Fitness',
  self_care: 'Self-care',
  cycle: 'Cycle',
};

/** Unit stored with the value for kinds that carry a number. */
export const WELLNESS_UNITS: Partial<Record<WellnessKind, string>> = {
  sleep: 'h',
  water: 'L',
  fitness: 'min',
};

export const CYCLE_LABELS = [
  'Period start',
  'Period end',
  'Spotting',
  'Cramps',
  'Headache',
  'Low energy',
  'Mood swing',
  'Other',
] as const;

export const MOOD_WORDS: Record<number, string> = {
  1: 'Rough',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};
export const ENERGY_WORDS: Record<number, string> = {
  1: 'Drained',
  2: 'Tired',
  3: 'Steady',
  4: 'Fresh',
  5: 'Full',
};

export const dateKeyValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');
const scale = z.coerce.number().int().min(1, 'Pick 1 to 5.').max(5, 'Pick 1 to 5.');

export const moodInput = z.object({
  lifeSegmentId: z.uuid().optional(),
  date: dateKeyValue,
  mood: scale,
  energy: scale,
  note: z.string().trim().max(1000).optional(),
});
export type MoodInput = z.infer<typeof moodInput>;

export const wellnessEntryInput = z.object({
  lifeSegmentId: z.uuid().optional(),
  kind: z.enum(WELLNESS_KINDS),
  date: dateKeyValue,
  value: z.coerce.number().min(0, 'Use a positive number.').max(100_000).optional(),
  unit: z.string().trim().max(20).optional(),
  label: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000).optional(),
});
export type WellnessEntryInput = z.infer<typeof wellnessEntryInput>;

export const treatmentPlanInput = z.object({
  lifeSegmentId: z.uuid().optional(),
  label: z.string().trim().min(1, 'Name the treatment.').max(120),
  dates: z.array(dateKeyValue).min(1, 'Pick at least one day.'),
});
export type TreatmentPlanInput = z.infer<typeof treatmentPlanInput>;

export const PRODUCT_CATEGORIES = [
  'Skincare',
  'Haircare',
  'Body',
  'Makeup',
  'Fragrance',
  'Supplements',
  'Other',
] as const;

export const productInput = z.object({
  name: z.string().trim().min(1, 'Give the product a name.').max(120),
  brand: z.string().trim().max(80).optional(),
  category: z.string().trim().max(60).optional(),
  inInventory: z.boolean().default(false),
  isFavourite: z.boolean().default(false),
  onWishlist: z.boolean().default(false),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  url: z.union([z.url('Use a full link.'), z.literal('')]).optional(),
  openedOn: dateKeyValue.optional(),
  expiresOn: dateKeyValue.optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type ProductInput = z.infer<typeof productInput>;

export const WELLNESS_JOURNAL_SCOPES = ['daily', 'weekly', 'monthly'] as const;
export type WellnessJournalScope = (typeof WELLNESS_JOURNAL_SCOPES)[number];
export const SCOPE_TITLES: Record<WellnessJournalScope, string> = {
  daily: 'Daily wellness journal',
  weekly: 'Weekly wellness journal',
  monthly: 'Monthly wellness journal',
};

export const wellnessJournalInput = z.object({
  id: z.uuid().optional(),
  lifeSegmentId: z.uuid().optional(),
  scope: z.enum(WELLNESS_JOURNAL_SCOPES),
  date: dateKeyValue,
  content: z.string().trim().min(1, 'Write something first.').max(20_000),
});
