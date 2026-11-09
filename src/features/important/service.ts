import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { importantRecords } from '@/db/schema';
import { NotFoundError } from '@/lib/errors';
import { getRecord, type ImportantRecord } from './queries';
import type { RecordInput } from './schema';

export async function createRecord(
  userId: string,
  input: RecordInput,
  fields: Record<string, string>
): Promise<ImportantRecord> {
  const [row] = await db
    .insert(importantRecords)
    .values({
      userId,
      kind: input.kind,
      title: input.title,
      fields,
      notes: input.notes || null,
      isSensitive: input.isSensitive,
    })
    .returning();
  return row;
}

export async function updateRecord(
  userId: string,
  id: string,
  input: RecordInput,
  fields: Record<string, string>
): Promise<ImportantRecord> {
  const existing = await getRecord(userId, id);
  if (!existing) throw new NotFoundError('That record does not exist.');
  const [row] = await db
    .update(importantRecords)
    .set({
      kind: input.kind,
      title: input.title,
      fields,
      notes: input.notes || null,
      isSensitive: input.isSensitive,
    })
    .where(and(eq(importantRecords.userId, userId), eq(importantRecords.id, id)))
    .returning();
  return row;
}

export async function removeRecord(userId: string, id: string): Promise<void> {
  const existing = await getRecord(userId, id);
  if (!existing) throw new NotFoundError('That record does not exist.');
  await db
    .update(importantRecords)
    .set({ deletedAt: new Date() })
    .where(and(eq(importantRecords.userId, userId), eq(importantRecords.id, id)));
}
