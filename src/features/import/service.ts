import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  captures,
  goals,
  habitCheckIns,
  habits,
  legacyImportFiles,
  legacyMap,
  routineSteps,
  routines,
  tasks,
} from '@/db/schema';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { ValidationError } from '@/lib/errors';
import { planImport, type ImportPlan } from './mapping';
import { legacyExport } from './schema';

export type ImportSummary = {
  imported: Record<string, number>;
  skipped: Record<string, number>;
  deferred: ImportPlan['deferred'];
  problems: string[];
};

/** Imports the old app's JSON. Idempotent: rows already mapped in `legacy_map` are skipped. */
export async function importLegacy(
  userId: string,
  raw: unknown,
  fileName?: string | null
): Promise<ImportSummary> {
  const parsed = legacyExport.safeParse(raw);
  if (!parsed.success)
    throw new ValidationError('That file is not an export from the old planner.');

  const [segments, prefs] = await Promise.all([
    listSegments(userId, { includeArchived: true }),
    getPreferences(userId),
  ]);
  const bySlug = Object.fromEntries(segments.map((s) => [s.slug, s.id]));
  const plan = planImport(parsed.data, bySlug, { now: new Date(), timeZone: prefs.timeZone });

  const existing = await db
    .select({
      entityType: legacyMap.entityType,
      legacyKey: legacyMap.legacyKey,
      newId: legacyMap.newId,
    })
    .from(legacyMap)
    .where(eq(legacyMap.userId, userId));
  const seen = new Map(existing.map((r) => [`${r.entityType}:${r.legacyKey}`, r.newId]));

  const imported: Record<string, number> = {
    tasks: 0,
    captures: 0,
    habits: 0,
    checkIns: 0,
    goals: 0,
    routines: 0,
    steps: 0,
  };
  const skipped: Record<string, number> = {
    tasks: 0,
    captures: 0,
    habits: 0,
    goals: 0,
    routines: 0,
  };

  await db.transaction(async (tx) => {
    const remember = async (entityType: string, legacyKey: string, newId: string) => {
      await tx
        .insert(legacyMap)
        .values({ userId, entityType, legacyKey, newId })
        .onConflictDoNothing();
      seen.set(`${entityType}:${legacyKey}`, newId);
    };

    for (const t of plan.tasks) {
      if (seen.has(`task:${t.key}`)) {
        skipped.tasks++;
        continue;
      }
      const [row] = await tx
        .insert(tasks)
        .values({
          userId,
          lifeSegmentId: t.lifeSegmentId,
          title: t.title,
          dueDate: t.dueDate,
          priority: t.priority,
          status: t.status,
          completedAt: t.completedAt,
        })
        .returning({ id: tasks.id });
      await remember('task', t.key, row.id);
      imported.tasks++;
    }

    for (const c of plan.captures) {
      if (seen.has(`capture:${c.key}`)) {
        skipped.captures++;
        continue;
      }
      const [row] = await tx
        .insert(captures)
        .values({ userId, text: c.text, kind: 'task' })
        .returning({ id: captures.id });
      await remember('capture', c.key, row.id);
      imported.captures++;
    }

    for (const h of plan.habits) {
      if (seen.has(`habit:${h.key}`)) {
        skipped.habits++;
        continue;
      }
      const [row] = await tx
        .insert(habits)
        .values({
          userId,
          lifeSegmentId: h.lifeSegmentId,
          name: h.name,
          frequency: h.frequency,
          target: h.target,
        })
        .returning({ id: habits.id });
      await remember('habit', h.key, row.id);
      imported.habits++;
      if (h.checkInDates.length > 0) {
        const inserted = await tx
          .insert(habitCheckIns)
          .values(h.checkInDates.map((date) => ({ userId, habitId: row.id, date })))
          .onConflictDoNothing()
          .returning({ id: habitCheckIns.id });
        imported.checkIns += inserted.length;
      }
    }

    for (const g of plan.goals) {
      if (seen.has(`goal:${g.key}`)) {
        skipped.goals++;
        continue;
      }
      const [row] = await tx
        .insert(goals)
        .values({
          userId,
          lifeSegmentId: g.lifeSegmentId,
          title: g.title,
          horizon: g.horizon,
          status: g.status,
          progress: g.status === 'achieved' ? 100 : 0,
        })
        .returning({ id: goals.id });
      await remember('goal', g.key, row.id);
      imported.goals++;
    }

    for (const r of plan.routines) {
      if (seen.has(`routine:${r.key}`)) {
        skipped.routines++;
        continue;
      }
      const [row] = await tx
        .insert(routines)
        .values({ userId, lifeSegmentId: r.lifeSegmentId, kind: r.kind, name: r.name })
        .returning({ id: routines.id });
      await remember('routine', r.key, row.id);
      imported.routines++;
      for (const step of r.steps) {
        const [stepRow] = await tx
          .insert(routineSteps)
          .values({ userId, routineId: row.id, title: step.title, sortOrder: step.sortOrder })
          .returning({ id: routineSteps.id });
        await remember('routine_step', step.key, stepRow.id);
        imported.steps++;
      }
    }

    await tx.insert(legacyImportFiles).values({
      userId,
      fileName: fileName ?? null,
      raw: parsed.data,
      summary: { imported, skipped, deferred: plan.deferred, problems: plan.problems },
    });
  });

  return { imported, skipped, deferred: plan.deferred, problems: plan.problems };
}
