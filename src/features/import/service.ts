import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  bibleStudies,
  captures,
  courses,
  goals,
  habitCheckIns,
  habits,
  ingredients,
  journalEntries,
  legacyImportFiles,
  legacyMap,
  mealPlanEntries,
  mealPlans,
  notes,
  recipes,
  routineSteps,
  routines,
  subjects,
  tasks,
} from '@/db/schema';
import { listSegments } from '@/features/life-segments/service';
import { getPreferences } from '@/features/settings/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { planDeferredImport, planImport, type DeferredPlan, type ImportPlan } from './mapping';
import { legacyExport } from './schema';

export type ImportSummary = {
  imported: Record<string, number>;
  skipped: Record<string, number>;
  deferred: ImportPlan['deferred'];
  problems: string[];
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Counters = { imported: Record<string, number>; skipped: Record<string, number> };

/**
 * Inserts the Release 3 and 4 sections (Bible studies, subjects and courses,
 * journal entries, quotes, recipes and meal plan days), skipping anything
 * already in `legacy_map`.
 */
async function applyDeferredPlan(
  tx: Tx,
  userId: string,
  plan: DeferredPlan,
  seen: Map<string, string>,
  counters: Counters
) {
  const remember = async (entityType: string, legacyKey: string, newId: string) => {
    await tx
      .insert(legacyMap)
      .values({ userId, entityType, legacyKey, newId })
      .onConflictDoNothing();
    seen.set(`${entityType}:${legacyKey}`, newId);
  };
  const { imported, skipped } = counters;
  for (const k of [
    'bibleStudies',
    'subjects',
    'courses',
    'journal',
    'quotes',
    'recipes',
    'mealDays',
  ]) {
    imported[k] ??= 0;
    skipped[k] ??= 0;
  }

  for (const b of plan.bibleStudies) {
    if (seen.has(`bible_study:${b.key}`)) {
      skipped.bibleStudies++;
      continue;
    }
    const [row] = await tx
      .insert(bibleStudies)
      .values({
        userId,
        lifeSegmentId: b.lifeSegmentId,
        title: b.title,
        kind: b.kind,
        status: b.status,
        priority: b.priority,
        translation: b.translation,
      })
      .returning({ id: bibleStudies.id });
    await remember('bible_study', b.key, row.id);
    imported.bibleStudies++;
  }
  // Prerequisites point at other studies, so they resolve after every study has an id.
  for (const b of plan.bibleStudies) {
    if (!b.prerequisiteKey) continue;
    const id = seen.get(`bible_study:${b.key}`);
    const prereq = seen.get(`bible_study:${b.prerequisiteKey}`);
    if (!id || !prereq || id === prereq) continue;
    await tx.update(bibleStudies).set({ prerequisiteId: prereq }).where(eq(bibleStudies.id, id));
  }

  for (const sub of plan.subjects) {
    if (seen.has(`subject:${sub.key}`)) {
      skipped.subjects++;
      continue;
    }
    const [row] = await tx
      .insert(subjects)
      .values({ userId, lifeSegmentId: sub.lifeSegmentId, name: sub.name })
      .returning({ id: subjects.id });
    await remember('subject', sub.key, row.id);
    imported.subjects++;
  }

  for (const c of plan.courses) {
    if (seen.has(`course:${c.key}`)) {
      skipped.courses++;
      continue;
    }
    const [row] = await tx
      .insert(courses)
      .values({
        userId,
        lifeSegmentId: c.lifeSegmentId,
        subjectId: seen.get(`subject:${c.subjectKey}`) ?? null,
        title: c.title,
        dueDate: c.dueDate,
        progress: c.progress,
        status: c.progress >= 100 ? 'done' : c.progress > 0 ? 'in_progress' : 'planned',
        notes: c.notes,
      })
      .returning({ id: courses.id });
    await remember('course', c.key, row.id);
    imported.courses++;
  }

  for (const j of plan.journal) {
    if (seen.has(`journal:${j.key}`)) {
      skipped.journal++;
      continue;
    }
    const [row] = await tx
      .insert(journalEntries)
      .values({
        userId,
        lifeSegmentId: j.lifeSegmentId,
        kind: 'daily',
        date: j.date,
        content: j.content,
      })
      .returning({ id: journalEntries.id });
    await remember('journal', j.key, row.id);
    imported.journal++;
  }

  for (const q of plan.quotes) {
    if (seen.has(`quote:${q.key}`)) {
      skipped.quotes++;
      continue;
    }
    const [row] = await tx
      .insert(notes)
      .values({
        userId,
        lifeSegmentId: q.lifeSegmentId,
        kind: 'quote',
        title: q.title,
        content: q.content,
        author: q.author,
        source: q.source,
      })
      .returning({ id: notes.id });
    await remember('quote', q.key, row.id);
    imported.quotes++;
  }

  for (const r of plan.recipes) {
    if (seen.has(`recipe:${r.key}`)) {
      skipped.recipes++;
      continue;
    }
    const [row] = await tx
      .insert(recipes)
      .values({ userId, title: r.title, instructions: r.instructions, servings: 2 })
      .returning({ id: recipes.id });
    if (r.ingredients.length > 0) {
      await tx.insert(ingredients).values(
        r.ingredients.map((i) => ({
          userId,
          recipeId: row.id,
          name: i.name,
          quantity: i.quantity === null ? null : String(i.quantity),
          unit: i.unit,
          sortOrder: i.sortOrder,
        }))
      );
    }
    await remember('recipe', r.key, row.id);
    imported.recipes++;
  }

  for (const week of plan.mealWeeks) {
    let planId = seen.get(`meal_plan:${week.key}`);
    if (!planId) {
      const [row] = await tx
        .insert(mealPlans)
        .values({
          userId,
          lifeSegmentId: week.lifeSegmentId,
          name: `Week of ${week.startDate}`,
          startDate: week.startDate,
          endDate: week.endDate,
        })
        .returning({ id: mealPlans.id });
      planId = row.id;
      await remember('meal_plan', week.key, planId);
    }
    for (const entry of week.entries) {
      if (seen.has(`meal_entry:${entry.key}`)) {
        skipped.mealDays++;
        continue;
      }
      const recipeId = seen.get(`recipe:${entry.recipeKey}`);
      if (!recipeId) {
        plan.problems.push(
          `No recipe for the meal on ${entry.date} (old recipe ${entry.recipeKey}).`
        );
        skipped.mealDays++;
        continue;
      }
      const [row] = await tx
        .insert(mealPlanEntries)
        .values({ userId, planId, date: entry.date, slot: 'dinner', recipeId, servings: 2 })
        .returning({ id: mealPlanEntries.id });
      await remember('meal_entry', entry.key, row.id);
      imported.mealDays++;
    }
  }
}

async function loadSeen(userId: string): Promise<Map<string, string>> {
  const existing = await db
    .select({
      entityType: legacyMap.entityType,
      legacyKey: legacyMap.legacyKey,
      newId: legacyMap.newId,
    })
    .from(legacyMap)
    .where(eq(legacyMap.userId, userId));
  return new Map(existing.map((r) => [`${r.entityType}:${r.legacyKey}`, r.newId]));
}

export type StoredImportFile = {
  id: string;
  fileName: string | null;
  importedAt: Date;
  summary: Record<string, unknown> | null;
};

/** The most recent stored export, used by "Import the rest". */
export async function getLatestImportFile(userId: string): Promise<StoredImportFile | null> {
  const [row] = await db
    .select({
      id: legacyImportFiles.id,
      fileName: legacyImportFiles.fileName,
      importedAt: legacyImportFiles.importedAt,
      summary: legacyImportFiles.summary,
    })
    .from(legacyImportFiles)
    .where(eq(legacyImportFiles.userId, userId))
    .orderBy(desc(legacyImportFiles.importedAt))
    .limit(1);
  return row ?? null;
}

/** Imports the Release 3 and 4 sections from the latest stored export. */
export async function importDeferred(userId: string): Promise<ImportSummary> {
  const [latest] = await db
    .select()
    .from(legacyImportFiles)
    .where(eq(legacyImportFiles.userId, userId))
    .orderBy(desc(legacyImportFiles.importedAt))
    .limit(1);
  if (!latest) throw new NotFoundError('No stored export yet. Import the JSON file first.');
  const parsed = legacyExport.safeParse(latest.raw);
  if (!parsed.success) throw new ValidationError('The stored export could not be read.');

  const [segments, prefs] = await Promise.all([
    listSegments(userId, { includeArchived: true }),
    getPreferences(userId),
  ]);
  const bySlug = Object.fromEntries(segments.map((s) => [s.slug, s.id]));
  const plan = planDeferredImport(parsed.data, bySlug, {
    timeZone: prefs.timeZone,
    weekStartsOn: prefs.weekStartsOn,
  });
  const seen = await loadSeen(userId);
  const counters: Counters = { imported: {}, skipped: {} };

  await db.transaction(async (tx) => {
    await applyDeferredPlan(tx, userId, plan, seen, counters);
    await tx
      .update(legacyImportFiles)
      .set({
        summary: {
          ...(latest.summary ?? {}),
          deferredImportedAt: new Date().toISOString(),
          deferredImport: { ...counters, deferred: plan.stillDeferred },
        },
      })
      .where(eq(legacyImportFiles.id, latest.id));
  });

  return { ...counters, deferred: plan.stillDeferred, problems: plan.problems };
}

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
  const deferredPlan = planDeferredImport(parsed.data, bySlug, {
    timeZone: prefs.timeZone,
    weekStartsOn: prefs.weekStartsOn,
  });
  const seen = await loadSeen(userId);

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

    await applyDeferredPlan(tx, userId, deferredPlan, seen, { imported, skipped });

    await tx.insert(legacyImportFiles).values({
      userId,
      fileName: fileName ?? null,
      raw: parsed.data,
      summary: { imported, skipped, deferred: plan.deferred, problems: plan.problems },
    });
  });

  return {
    imported,
    skipped,
    deferred: plan.deferred,
    problems: [...plan.problems, ...deferredPlan.problems],
  };
}
