import 'server-only';
import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import { journalEntries, lifeSegments } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';
import type { JournalKind } from './schema';

export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalEntryRow = JournalEntry & { segment: SegmentRef };

const base = () =>
  db
    .select({ entry: journalEntries, segment: segmentRefColumns })
    .from(journalEntries)
    .innerJoin(lifeSegments, eq(journalEntries.lifeSegmentId, lifeSegments.id));

const toRow = (r: { entry: JournalEntry; segment: SegmentRef }): JournalEntryRow => ({
  ...r.entry,
  segment: r.segment,
});

/** Entries with yyyy-MM-dd dates in [fromKey, toKey], inclusive. */
export async function listEntriesBetween(
  userId: string,
  fromKey: string,
  toKey: string,
  opts: { kind?: JournalKind } = {}
): Promise<JournalEntryRow[]> {
  const conds = [
    eq(journalEntries.userId, userId),
    isNull(journalEntries.deletedAt),
    gte(journalEntries.date, fromKey),
    lte(journalEntries.date, toKey),
  ];
  if (opts.kind) conds.push(eq(journalEntries.kind, opts.kind));
  const rows = await base()
    .where(and(...conds))
    .orderBy(desc(journalEntries.date), asc(journalEntries.kind), asc(journalEntries.createdAt));
  return rows.map(toRow);
}

export type DayEntries = {
  daily: JournalEntryRow | null;
  gratitude: JournalEntryRow | null;
  others: JournalEntryRow[];
};

/** Everything written on one day: the daily entry, the gratitude list, and any other kinds. */
export async function getDayEntries(userId: string, dateKey: string): Promise<DayEntries> {
  const rows = await listEntriesBetween(userId, dateKey, dateKey);
  return {
    daily: rows.find((r) => r.kind === 'daily') ?? null,
    gratitude: rows.find((r) => r.kind === 'gratitude') ?? null,
    others: rows.filter((r) => r.kind !== 'daily' && r.kind !== 'gratitude'),
  };
}

/** The most recent entries, newest first. */
export async function listRecentEntries(userId: string, limit = 30): Promise<JournalEntryRow[]> {
  const rows = await base()
    .where(and(eq(journalEntries.userId, userId), isNull(journalEntries.deletedAt)))
    .orderBy(desc(journalEntries.date), desc(journalEntries.updatedAt))
    .limit(limit);
  return rows.map(toRow);
}
