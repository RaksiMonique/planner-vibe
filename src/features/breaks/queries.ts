import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { breakIdeas, habits, type BreakIdea } from '@/db/schema';

export async function listBreakIdeas(userId: string): Promise<BreakIdea[]> {
  return db
    .select()
    .from(breakIdeas)
    .where(eq(breakIdeas.userId, userId))
    .orderBy(asc(breakIdeas.sortOrder), asc(breakIdeas.createdAt));
}

/** Live habits a break can count for. */
export async function listBreakHabitOptions(
  userId: string
): Promise<Array<{ id: string; name: string }>> {
  return db
    .select({ id: habits.id, name: habits.name })
    .from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.deletedAt), isNull(habits.archivedAt)))
    .orderBy(asc(habits.name));
}
