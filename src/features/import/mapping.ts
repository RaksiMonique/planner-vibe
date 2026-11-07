import { formatInTimeZone } from 'date-fns-tz';
import { legacyBibleStudy, legacyQuote, legacyStudy, type LegacyExport } from './schema';

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

/** Sections that still wait for a later release (recipes and meal plans arrive in Release 4). */
export const DEFERRED_SECTIONS = ['recipes', 'mealPlan'] as const;

/** Sections Release 3 imports from the stored raw file. */
export const RELEASE3_SECTIONS = ['bibleStudies', 'studies', 'journal', 'quotes'] as const;

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
    deferred: { recipes: 0, mealPlan: 0 },
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
    recipes: legacy.recipes.length,
    mealPlan: Object.keys(legacy.mealPlan).length,
  };
  return plan;
}

export type PlannedBibleStudy = {
  key: string;
  lifeSegmentId: string;
  title: string;
  kind: 'study' | 'devotional' | 'reading' | 'course';
  status: 'not_started' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  translation: string | null;
  /** Legacy key of the prerequisite study, resolved through legacy_map after insert. */
  prerequisiteKey: string | null;
};
export type PlannedSubject = { key: string; lifeSegmentId: string; name: string };
export type PlannedCourse = {
  key: string;
  lifeSegmentId: string;
  subjectKey: string;
  title: string;
  dueDate: string | null;
  progress: number;
  notes: string | null;
};
export type PlannedJournalEntry = {
  key: string;
  lifeSegmentId: string;
  date: string;
  content: string;
};
export type PlannedQuote = {
  key: string;
  lifeSegmentId: string;
  content: string;
  author: string | null;
  source: string | null;
  title: string | null;
};

export type DeferredPlan = {
  bibleStudies: PlannedBibleStudy[];
  subjects: PlannedSubject[];
  courses: PlannedCourse[];
  journal: PlannedJournalEntry[];
  quotes: PlannedQuote[];
  stillDeferred: Record<(typeof DEFERRED_SECTIONS)[number], number>;
  problems: string[];
};

function bibleKind(type: string | null | undefined): PlannedBibleStudy['kind'] {
  const t = (type ?? '').trim().toLowerCase();
  if (t.includes('devotion')) return 'devotional';
  if (t.includes('reading') || t.includes('plan')) return 'reading';
  if (t.includes('course')) return 'course';
  return 'study';
}

function bibleStatus(status: string | null | undefined): PlannedBibleStudy['status'] {
  const s = (status ?? '').trim().toLowerCase();
  if (s.startsWith('complete') || s === 'done') return 'done';
  if (s.includes('progress')) return 'in_progress';
  return 'not_started';
}

function wordPriority(priority: string | null | undefined): PlannedBibleStudy['priority'] {
  const p = (priority ?? '').trim().toLowerCase();
  if (p === 'high') return 'high';
  if (p === 'low') return 'low';
  return 'medium';
}

/**
 * Pure mapping for the sections Release 1 stored raw: Bible studies, studies
 * (a subject per category plus a course per study), the journal and quotes.
 */
export function planDeferredImport(
  legacy: LegacyExport,
  segmentsBySlug: Record<string, string>,
  opts: { timeZone: string; fallbackSlug?: string }
): DeferredPlan {
  const fallbackSlug = opts.fallbackSlug ?? 'growth';
  const problems: string[] = [];
  const segmentId = (slug: string): string | null => {
    const id =
      segmentsBySlug[slug] ?? segmentsBySlug[fallbackSlug] ?? Object.values(segmentsBySlug)[0];
    if (!id) problems.push(`No Life Segment available for "${slug}".`);
    return id ?? null;
  };
  const plan: DeferredPlan = {
    bibleStudies: [],
    subjects: [],
    courses: [],
    journal: [],
    quotes: [],
    stillDeferred: {
      recipes: legacy.recipes.length,
      mealPlan: Object.keys(legacy.mealPlan).length,
    },
    problems,
  };

  const faith = segmentId('faith');
  for (const raw of legacy.bibleStudies) {
    const parsed = legacyBibleStudy.safeParse(raw);
    if (!parsed.success || !faith) {
      problems.push('A Bible study in the export could not be read and was skipped.');
      continue;
    }
    const b = parsed.data;
    const title = b.name.trim();
    if (!title) continue;
    plan.bibleStudies.push({
      key: String(b.id),
      lifeSegmentId: faith,
      title,
      kind: bibleKind(b.type),
      status: bibleStatus(b.status),
      priority: wordPriority(b.priority),
      translation: b.bible?.trim() || null,
      prerequisiteKey: b.prereqId === null || b.prereqId === undefined ? null : String(b.prereqId),
    });
  }

  const learning = segmentId('learning');
  const subjectKeys = new Map<string, string>();
  for (const raw of legacy.studies) {
    const parsed = legacyStudy.safeParse(raw);
    if (!parsed.success || !learning) {
      problems.push('A study in the export could not be read and was skipped.');
      continue;
    }
    const st = parsed.data;
    const title = st.title.trim();
    if (!title) continue;
    const category = st.category?.trim() || 'General';
    const subjectKey = `subject:${category.toLowerCase()}`;
    if (!subjectKeys.has(subjectKey)) {
      subjectKeys.set(subjectKey, category);
      plan.subjects.push({ key: subjectKey, lifeSegmentId: learning, name: category });
    }
    plan.courses.push({
      key: String(st.id),
      lifeSegmentId: learning,
      subjectKey,
      title,
      dueDate: st.deadline ? toDateKey(st.deadline, opts.timeZone) : null,
      progress: Math.max(0, Math.min(100, Math.round(st.progress ?? 0))),
      notes: st.notes?.trim() || null,
    });
  }

  const growth = segmentId('growth');
  for (const [date, value] of Object.entries(legacy.journal)) {
    const key = toDateKey(date, opts.timeZone);
    if (!key || !growth) continue;
    const content =
      typeof value === 'string'
        ? value
        : value &&
            typeof value === 'object' &&
            'content' in value &&
            typeof value.content === 'string'
          ? value.content
          : '';
    if (!content.trim()) continue;
    plan.journal.push({ key, lifeSegmentId: growth, date: key, content: content.trim() });
  }

  for (const raw of legacy.quotes) {
    const parsed = legacyQuote.safeParse(raw);
    if (!parsed.success || !growth) {
      problems.push('A quote in the export could not be read and was skipped.');
      continue;
    }
    const q = parsed.data;
    const content = q.text.trim();
    if (!content) continue;
    plan.quotes.push({
      key: String(q.id),
      lifeSegmentId: growth,
      content,
      author: q.author?.trim() || null,
      source: q.source?.trim() || null,
      title: q.type?.trim() || null,
    });
  }

  return plan;
}
