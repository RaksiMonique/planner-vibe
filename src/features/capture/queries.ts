import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { captures } from '@/db/schema';

export type Capture = typeof captures.$inferSelect;

/** Unfiled captures, newest first (the Inbox). */
export async function listCaptures(userId: string): Promise<Capture[]> {
  return db
    .select()
    .from(captures)
    .where(and(eq(captures.userId, userId), isNull(captures.convertedAt)))
    .orderBy(desc(captures.createdAt));
}
