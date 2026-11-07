import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { journalEntries, lifeSegments } from '@/db/schema';
import { listSegments } from '@/features/life-segments/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { JournalEntry } from './queries';
import { gratitudeLines, type JournalEntryInput, type JournalKind } from './schema';

export async function getEntryOrThrow(userId: string, id: string): Promise<JournalEntry> {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        eq(journalEntries.id, id),
        isNull(journalEntries.deletedAt)
      )
    )
    .limit(1);
  if (!row) throw new NotFoundError('That journal entry does not exist.');
  return row;
}

async function assertSegmentOwned(userId: string, lifeSegmentId: string) {
  const count = await db.$count(
    lifeSegments,
    and(eq(lifeSegments.id, lifeSegmentId), eq(lifeSegments.userId, userId))
  );
  if (count === 0) throw new ValidationError('That Life Segment does not exist.');
}

/** Journal entries default to Personal Development, else the first segment. */
export async function defaultJournalSegmentId(userId: string): Promise<string> {
  const segments = await listSegments(userId);
  const growth = segments.find((s) => s.slug === 'growth');
  const id = growth?.id ?? segments[0]?.id;
  if (!id) throw new ValidationError('Create a Life Segment first.');
  return id;
}

async function findDayEntry(userId: string, kind: JournalKind, date: string) {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        eq(journalEntries.kind, kind),
        eq(journalEntries.date, date),
        isNull(journalEntries.deletedAt)
      )
    )
    .orderBy(journalEntries.createdAt)
    .limit(1);
  return row ?? null;
}

/**
 * Saves an entry. Daily and gratitude entries are one per day, so without an
 * id the existing entry for that kind and date is updated in place.
 */
export async function saveEntry(
  userId: string,
  input: JournalEntryInput,
  id?: string
): Promise<JournalEntry> {
  await assertSegmentOwned(userId, input.lifeSegmentId);
  const values = {
    lifeSegmentId: input.lifeSegmentId,
    kind: input.kind,
    date: input.date,
    title: input.title || null,
    content: input.content,
    mood: input.mood ?? null,
  };
  const existing = id
    ? await getEntryOrThrow(userId, id)
    : input.kind === 'daily' || input.kind === 'gratitude'
      ? await findDayEntry(userId, input.kind, input.date)
      : null;
  if (existing) {
    const [row] = await db
      .update(journalEntries)
      .set(values)
      .where(and(eq(journalEntries.userId, userId), eq(journalEntries.id, existing.id)))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(journalEntries)
    .values({ userId, ...values })
    .returning();
  return row;
}

/** Replaces the day's gratitude list. An empty list removes the entry. */
export async function saveGratitude(
  userId: string,
  date: string,
  lines: string[],
  lifeSegmentId?: string
): Promise<JournalEntry | null> {
  const clean = lines.map((l) => l.trim()).filter(Boolean);
  const existing = await findDayEntry(userId, 'gratitude', date);
  if (clean.length === 0) {
    if (existing) await removeEntry(userId, existing.id);
    return null;
  }
  return saveEntry(
    userId,
    {
      lifeSegmentId:
        lifeSegmentId ?? existing?.lifeSegmentId ?? (await defaultJournalSegmentId(userId)),
      kind: 'gratitude',
      date,
      content: clean.join('\n'),
    },
    existing?.id
  );
}

/** Adds one line to the day's gratitude list, creating it when needed. */
export async function appendGratitude(userId: string, date: string, line: string) {
  const existing = await findDayEntry(userId, 'gratitude', date);
  const lines = [...gratitudeLines(existing?.content), line.trim()];
  return saveGratitude(userId, date, lines, existing?.lifeSegmentId);
}

export async function removeEntry(userId: string, id: string): Promise<void> {
  await getEntryOrThrow(userId, id);
  await db
    .update(journalEntries)
    .set({ deletedAt: new Date() })
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.id, id)));
}
