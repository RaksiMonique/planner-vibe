import 'server-only';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { importantRecords } from '@/db/schema';
import { matchesQuery, type ImportantKind } from './kinds';

export type ImportantRecord = typeof importantRecords.$inferSelect;

export async function listRecords(
  userId: string,
  filters: { kind?: ImportantKind; q?: string } = {}
): Promise<ImportantRecord[]> {
  const conds = [eq(importantRecords.userId, userId), isNull(importantRecords.deletedAt)];
  if (filters.kind) conds.push(eq(importantRecords.kind, filters.kind));
  const rows = await db
    .select()
    .from(importantRecords)
    .where(and(...conds))
    .orderBy(asc(importantRecords.kind), asc(importantRecords.title));
  return filters.q ? rows.filter((r) => matchesQuery(r, filters.q!)) : rows;
}

export async function getRecord(userId: string, id: string): Promise<ImportantRecord | null> {
  const [row] = await db
    .select()
    .from(importantRecords)
    .where(
      and(
        eq(importantRecords.userId, userId),
        eq(importantRecords.id, id),
        isNull(importantRecords.deletedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

/** The most recently edited records, capped for the dashboard preview. */
export async function listRecentRecords(userId: string, limit: number): Promise<ImportantRecord[]> {
  return db
    .select()
    .from(importantRecords)
    .where(and(eq(importantRecords.userId, userId), isNull(importantRecords.deletedAt)))
    .orderBy(desc(importantRecords.updatedAt), asc(importantRecords.title))
    .limit(limit);
}

export async function countRecords(userId: string): Promise<number> {
  return db.$count(
    importantRecords,
    and(eq(importantRecords.userId, userId), isNull(importantRecords.deletedAt))
  );
}
