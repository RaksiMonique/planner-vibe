/**
 * Event categories: five built-in keys plus whatever labels the user types.
 * A custom category exists for as long as an event carries it.
 */
export const EVENT_CATEGORIES = ['general', 'appointment', 'self_care', 'work', 'other'] as const;
export type BuiltInCategory = (typeof EVENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<BuiltInCategory, string> = {
  general: 'General',
  appointment: 'Appointment',
  self_care: 'Self-care',
  work: 'Work',
  other: 'Other',
};

export const CATEGORY_MAX_LENGTH = 40;

export function isBuiltInCategory(value: string): value is BuiltInCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(value);
}

/** The label to show for a stored category value. */
export function categoryLabel(value: string): string {
  return isBuiltInCategory(value) ? CATEGORY_LABELS[value] : value;
}

/**
 * Tidies a typed category: trims and squeezes spaces, and folds anything that
 * spells a built-in label or key back onto that key so "Work" never becomes a
 * second category beside Work.
 */
export function normalizeCategory(value: string): string {
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name) return 'general';
  const lower = name.toLowerCase();
  for (const key of EVENT_CATEGORIES) {
    if (lower === key || lower === CATEGORY_LABELS[key].toLowerCase()) return key;
  }
  return name;
}

/** Built-in keys first, then the user's labels, with no repeats. */
export function categoryChoices(custom: readonly string[]): string[] {
  const seen = new Set<string>(EVENT_CATEGORIES);
  const out: string[] = [...EVENT_CATEGORIES];
  for (const c of custom) {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}
