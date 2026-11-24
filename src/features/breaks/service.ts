import 'server-only';
import { and, eq, max } from 'drizzle-orm';
import { db } from '@/db';
import { breakIdeas, habits, type BreakIdea } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { listBreakIdeas } from './queries';
import { STARTER_BREAK_IDEAS, type BreakIdeaInput, type BreakIdeaView } from './schema';

export { listBreakHabitOptions, listBreakIdeas } from './queries';

export function toBreakIdeaView(row: BreakIdea): BreakIdeaView {
  return { id: row.id, title: row.title, isMovement: row.isMovement, habitId: row.habitId };
}

async function assertHabitOwned(userId: string, habitId: string | undefined) {
  if (!habitId) return;
  const n = await db.$count(habits, and(eq(habits.id, habitId), eq(habits.userId, userId)));
  if (n === 0) throw new ValidationError('Choose one of your habits.');
}

async function nextSortOrder(userId: string): Promise<number> {
  const [row] = await db
    .select({ top: max(breakIdeas.sortOrder) })
    .from(breakIdeas)
    .where(eq(breakIdeas.userId, userId));
  return (row?.top ?? -1) + 1;
}

export async function addBreakIdea(userId: string, input: BreakIdeaInput): Promise<BreakIdea> {
  await assertHabitOwned(userId, input.habitId);
  const [row] = await db
    .insert(breakIdeas)
    .values({
      userId,
      title: input.title,
      isMovement: input.isMovement,
      habitId: input.habitId ?? null,
      sortOrder: await nextSortOrder(userId),
    })
    .returning();
  return row;
}

export async function removeBreakIdea(userId: string, id: string): Promise<void> {
  const [row] = await db
    .delete(breakIdeas)
    .where(and(eq(breakIdeas.userId, userId), eq(breakIdeas.id, id)))
    .returning({ id: breakIdeas.id });
  if (!row) throw new NotFoundError('That break idea does not exist.');
}

/** Gives a user with no ideas yet the starter set. Returns how many were added. */
export async function addStarterBreakIdeas(userId: string): Promise<number> {
  const existing = await listBreakIdeas(userId);
  if (existing.length > 0) return 0;
  const rows = await db
    .insert(breakIdeas)
    .values(
      STARTER_BREAK_IDEAS.map((idea, i) => ({
        userId,
        title: idea.title,
        isMovement: idea.isMovement,
        sortOrder: i,
      }))
    )
    .returning({ id: breakIdeas.id });
  return rows.length;
}
