import { differenceInCalendarDays, parseISO } from 'date-fns';

/**
 * Pure rules for vehicle papers: which documents every vehicle is expected
 * to have, when one counts as due, and how to word it. Nothing here touches
 * the database.
 */

/** The papers every vehicle card shows a slot for, in this order. */
export const STANDARD_DOCUMENT_KINDS = ['Insurance', 'Fitness', 'Registration', 'Service'] as const;

/**
 * A document needs renewing from this many days before it expires: a task to
 * renew it appears then, and it closes only once the paper has a date further
 * out than this. Anything further away is simply in date and says nothing.
 */
export const RENEW_WITHIN_DAYS = 90;
/** Reminders go out at these marks before the expiry date. */
export const REMINDER_DAYS_BEFORE = [30, 7, 0] as const;

export type DocumentState = 'expired' | 'due' | 'ok';

export type DocumentStatus = {
  state: DocumentState;
  /** Whole days until it expires; negative once it has. */
  days: number;
  /** "Expires in 12 days", "Expired 3 days ago"; empty while the paper is comfortably in date. */
  wording: string;
};

export function documentStatus(expiresOn: string, todayKey: string): DocumentStatus {
  const days = differenceInCalendarDays(parseISO(expiresOn), parseISO(todayKey));
  const state: DocumentState = days < 0 ? 'expired' : days <= RENEW_WITHIN_DAYS ? 'due' : 'ok';
  return { state, days, wording: state === 'ok' ? '' : wording(days) };
}

function wording(days: number): string {
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days === -1) return 'Expired yesterday';
  if (days < 0) return `Expired ${-days} days ago`;
  if (days < 60) return `Expires in ${days} days`;
  const months = Math.round(days / 30);
  return `Expires in ${months} months`;
}

/** Title of the task that renews a paper. */
export function renewalTitle(kind: string, vehicleName: string): string {
  return `Renew ${kind} for ${vehicleName}`;
}

/** What to call a vehicle: its name, or its year, make and model. */
export function vehicleLabel(v: {
  name: string | null;
  year: number | null;
  make: string;
  model: string;
}): string {
  if (v.name?.trim()) return v.name.trim();
  return [v.year, v.make, v.model].filter(Boolean).join(' ');
}

/** Worst first: expired, then due, then fine; ties by the nearest date. */
export function compareByUrgency(a: { expiresOn: string }, b: { expiresOn: string }): number {
  return a.expiresOn.localeCompare(b.expiresOn);
}

/** Standard kinds first in their fixed order, then the user's own kinds alphabetically. */
export function orderKinds(kinds: string[]): string[] {
  const standard = STANDARD_DOCUMENT_KINDS.filter((k) => kinds.includes(k));
  const custom = kinds
    .filter((k) => !(STANDARD_DOCUMENT_KINDS as readonly string[]).includes(k))
    .sort((a, b) => a.localeCompare(b));
  return [...standard, ...custom];
}
