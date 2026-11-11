import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { budgets, lifeSegments } from '@/db/schema';
import { segmentRefColumns } from '@/features/life-segments/queries';
import type { SegmentRef } from '@/features/life-segments/types';

export type Budget = typeof budgets.$inferSelect;
export type BudgetRow = Budget & { segment: SegmentRef };

/** Every live budget, monthly before annual, in the user's order then by name. */
export async function listBudgets(userId: string): Promise<BudgetRow[]> {
  const rows = await db
    .select({ budget: budgets, segment: segmentRefColumns })
    .from(budgets)
    .innerJoin(lifeSegments, eq(budgets.lifeSegmentId, lifeSegments.id))
    .where(and(eq(budgets.userId, userId), isNull(budgets.deletedAt)))
    .orderBy(asc(budgets.period), asc(budgets.sortOrder), asc(budgets.name));
  return rows.map((r) => ({ ...r.budget, segment: r.segment }));
}

export async function getBudget(userId: string, id: string): Promise<BudgetRow | null> {
  const [row] = await db
    .select({ budget: budgets, segment: segmentRefColumns })
    .from(budgets)
    .innerJoin(lifeSegments, eq(budgets.lifeSegmentId, lifeSegments.id))
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id), isNull(budgets.deletedAt)))
    .limit(1);
  return row ? { ...row.budget, segment: row.segment } : null;
}
