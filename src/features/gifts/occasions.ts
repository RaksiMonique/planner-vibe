/** Pure helpers for the Gifts dashboard card: what is coming up and how ready the gifts are. */

import { daysUntil, nextAnniversary } from './grouping';
import type { GiftStatus } from './schema';

export type OccasionRecipient = { id: string; name: string; birthday: string | null };
export type OccasionGift = {
  recipientId: string;
  occasion: string | null;
  occasionDate: string | null;
  status: GiftStatus;
};

export type UpcomingOccasion<G extends OccasionGift> = {
  key: string;
  person: string;
  occasion: string;
  dateKey: string;
  days: number;
  gifts: G[];
};

const isBirthdayWord = (occasion: string | null) => /birthday/i.test(occasion ?? '');

/**
 * Birthdays (from recipients) and dated gift occasions falling within `windowDays`
 * of today, soonest first. Gifts dated on a birthday, or undated birthday gifts
 * for that person, count towards the birthday row rather than a second row.
 */
export function upcomingOccasions<G extends OccasionGift>(
  recipients: OccasionRecipient[],
  gifts: G[],
  todayKey: string,
  windowDays = 60
): UpcomingOccasion<G>[] {
  const byRecipient = new Map(recipients.map((r) => [r.id, r]));
  const rows = new Map<string, UpcomingOccasion<G>>();
  const claimed = new Set<G>();

  for (const r of recipients) {
    if (!r.birthday) continue;
    const dateKey = nextAnniversary(r.birthday, todayKey);
    const days = daysUntil(dateKey, todayKey);
    if (days > windowDays) continue;
    const own = gifts.filter(
      (g) =>
        g.recipientId === r.id &&
        g.status !== 'given' &&
        (g.occasionDate === dateKey || (!g.occasionDate && isBirthdayWord(g.occasion)))
    );
    own.forEach((g) => claimed.add(g));
    rows.set(`birthday|${r.id}`, {
      key: `birthday|${r.id}`,
      person: r.name,
      occasion: 'Birthday',
      dateKey,
      days,
      gifts: own,
    });
  }

  for (const g of gifts) {
    if (claimed.has(g) || !g.occasionDate || g.status === 'given') continue;
    const days = daysUntil(g.occasionDate, todayKey);
    if (days < 0 || days > windowDays) continue;
    const person = byRecipient.get(g.recipientId)?.name ?? 'Someone';
    const occasion = g.occasion?.trim() || 'Occasion';
    const key = `${g.occasionDate}|${g.recipientId}|${occasion.toLowerCase()}`;
    const row = rows.get(key) ?? {
      key,
      person,
      occasion,
      dateKey: g.occasionDate,
      days,
      gifts: [],
    };
    row.gifts.push(g);
    rows.set(key, row);
  }

  return [...rows.values()].sort(
    (a, b) => a.days - b.days || a.person.localeCompare(b.person) || a.key.localeCompare(b.key)
  );
}

/** "today", "tomorrow", or "in N days". */
export function inDays(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

const STATUS_WORDS: Record<Exclude<GiftStatus, 'given'>, [string, string]> = {
  idea: ['idea', 'ideas'],
  planned: ['planned', 'planned'],
  purchased: ['bought', 'bought'],
  wrapped: ['wrapped', 'wrapped'],
};

/** A short readiness line such as "2 ideas, 1 bought", or "No gift yet". */
export function summariseGiftStatus(gifts: Array<{ status: GiftStatus }>): string {
  const counts = new Map<GiftStatus, number>();
  for (const g of gifts)
    if (g.status !== 'given') counts.set(g.status, (counts.get(g.status) ?? 0) + 1);
  const parts: string[] = [];
  for (const status of ['wrapped', 'purchased', 'planned', 'idea'] as const) {
    const n = counts.get(status);
    if (!n) continue;
    const [one, many] = STATUS_WORDS[status];
    parts.push(`${n} ${n === 1 ? one : many}`);
  }
  return parts.length > 0 ? parts.join(', ') : 'No gift yet';
}
