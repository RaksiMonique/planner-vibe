import { formatInTimeZone } from 'date-fns-tz';
import type { LegacyExport } from './schema';

/** Old segment names to new default slugs (instructions.md, Starting point). */
export const SEGMENT_MAP: Record<string, string> = {
  god: 'faith',
  faith: 'faith',
  finance: 'finance',
  health: 'health',
  business: 'career',
  career: 'career',
  leisure: 'recreation',
  recreation: 'recreation',
};

export const DEFERRED_SECTIONS = [
  'bibleStudies',
  'studies',
  'recipes',
  'mealPlan',
  'journal',
  'quotes',
] as const;

/** Legacy habits carry no segment; guess one from the name, else Personal Development. */
export function guessHabitSegment(name: string): string {
  const n = name.toLowerCase();
  if (/bible|pray|scripture|rosary|mass|devotion/.test(n)) return 'faith';
  if (/exercise|run|walk|water|sleep|gym|steps|stretch|yoga|vitamin|meditat/.test(n))
    return 'health';
  if (/read|study|learn|course|practice|language/.test(n)) return 'learning';
  if (/spend|save|budget|invest|money/.test(n)) return 'finance';
  return 'growth';
}

export type PlannedTask = {
  key: string;
  lifeSegmentId: string;
  title: string;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'done';
  completedAt: Date | null;
};
export type PlannedHabit = {
  key: string;
  lifeSegmentId: string;
  name: string;
  frequency: 'monthly';
  target: number;
  checkInDates: string[];
};
export type PlannedGoal = {
  key: string;
  lifeSegmentId: string;
  title: string;
  horizon: 'annual';
  status: 'achieved' | 'active';
};
export type PlannedRoutine = {
  key: string;
  lifeSegmentId: string;
  kind: 'morning' | 'evening';
  name: string;
  steps: { key: string; title: string; sortOrder: number }[];
};

export type ImportPlan = {
  tasks: PlannedTask[];
  captures: { key: string; text: string }[];
  habits: PlannedHabit[];
  goals: PlannedGoal[];
  routines: PlannedRoutine[];
  deferred: Record<(typeof DEFERRED_SECTIONS)[number], number>;
  problems: string[];
};

function priorityOf(n: number | null | undefined): PlannedTask['priority'] {
  if (n === null || n === undefined) return 'medium';
  if (n >= 5) return 'high';
  if (n <= 1) return 'low';
  return 'medium';
}

function toDateKey(value: number | string, timeZone: string): string | null {
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? formatInTimeZone(new Date(value), timeZone, 'yyyy-MM-dd')
      : null;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : formatInTimeZone(new Date(parsed), timeZone, 'yyyy-MM-dd');
}

/**
 * Pure mapping from the legacy export to rows to insert. `segmentsBySlug`
 * maps the user's segment slugs to ids; `fallbackSlug` is used when a mapped
 * slug does not exist (the user renamed or archived it).
 */
export function planImport(
  legacy: LegacyExport,
  segmentsBySlug: Record<string, string>,
  opts: { now: Date; timeZone: string; fallbackSlug?: string }
): ImportPlan {
  const fallbackSlug = opts.fallbackSlug ?? 'growth';
  const problems: string[] = [];
  const segmentId = (slug: string): string | null => {
    const id =
      segmentsBySlug[slug] ?? segmentsBySlug[fallbackSlug] ?? Object.values(segmentsBySlug)[0];
    if (!id) problems.push(`No Life Segment available for "${slug}".`);
    return id ?? null;
  };
  const mapLegacySegment = (name: string | null | undefined): string | null => {
    const slug = SEGMENT_MAP[(name ?? '').trim().toLowerCase()] ?? null;
    if (!slug) return null;
    return segmentId(slug);
  };

  const plan: ImportPlan = {
    tasks: [],
    captures: [],
    habits: [],
    goals: [],
    routines: [],
    deferred: { bibleStudies: 0, studies: 0, recipes: 0, mealPlan: 0, journal: 0, quotes: 0 },
    problems,
  };

  for (const t of legacy.tasks) {
    const key = String(t.id);
    const title = t.title.trim();
    if (!title) continue;
    const seg = (t.segment ?? '').trim() ? mapLegacySegment(t.segment) : null;
    if (!seg) {
      plan.captures.push({ key, text: title });
      continue;
    }
    const done = Boolean(t.completed ?? t.done);
    plan.tasks.push({
      key,
      lifeSegmentId: seg,
      title,
      dueDate: t.dueDate ? toDateKey(t.dueDate, opts.timeZone) : null,
      priority: priorityOf(t.priority),
      status: done ? 'done' : 'todo',
      completedAt: done ? opts.now : null,
    });
  }

  for (const h of legacy.habits) {
    const name = h.name.trim();
    if (!name) continue;
    const seg = segmentId(guessHabitSegment(name));
    if (!seg) continue;
    const dates = new Set<string>();
    for (const log of h.logs) {
      const key = toDateKey(log, opts.timeZone);
      if (key) dates.add(key);
    }
    plan.habits.push({
      key: name,
      lifeSegmentId: seg,
      name,
      frequency: 'monthly',
      target: Math.max(1, Math.round(h.goal ?? 1)),
      checkInDates: [...dates].sort(),
    });
  }

  for (const [segmentName, goals] of Object.entries(legacy.segments)) {
    const seg = mapLegacySegment(segmentName) ?? segmentId(fallbackSlug);
    if (!seg) continue;
    goals.forEach((g, index) => {
      const title = g.text.trim();
      if (!title) return;
      plan.goals.push({
        key: `${segmentName}:${index}`,
        lifeSegmentId: seg,
        title,
        horizon: 'annual',
        status: g.done ? 'achieved' : 'active',
      });
    });
  }

  for (const kind of ['morning', 'evening'] as const) {
    const steps = legacy.routines[kind].map((s) => s.trim()).filter(Boolean);
    if (steps.length === 0) continue;
    const seg = segmentId('growth');
    if (!seg) continue;
    plan.routines.push({
      key: kind,
      lifeSegmentId: seg,
      kind,
      name: kind === 'morning' ? 'Morning routine' : 'Evening routine',
      steps: steps.map((title, index) => ({ key: `${kind}:${index}`, title, sortOrder: index })),
    });
  }

  plan.deferred = {
    bibleStudies: legacy.bibleStudies.length,
    studies: legacy.studies.length,
    recipes: legacy.recipes.length,
    mealPlan: Object.keys(legacy.mealPlan).length,
    journal: Object.keys(legacy.journal).length,
    quotes: legacy.quotes.length,
  };
  return plan;
}
