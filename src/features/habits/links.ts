/**
 * What a habit can be linked to, and how to show it. Plain module: server and
 * client code both import it (instructions.md 8.2).
 */
export const HABIT_LINK_KINDS = [
  'course',
  'subject',
  'bible_study',
  'reading_plan',
  'routine',
  'goal',
] as const;
export type HabitLinkKind = (typeof HABIT_LINK_KINDS)[number];

export const HABIT_LINK_LABELS: Record<HabitLinkKind, string> = {
  course: 'Course',
  subject: 'Subject',
  bible_study: 'Bible study',
  reading_plan: 'Reading plan',
  routine: 'Routine',
  goal: 'Goal',
};

export const HABIT_LINK_GROUP_LABELS: Record<HabitLinkKind, string> = {
  course: 'Courses',
  subject: 'Subjects',
  bible_study: 'Bible studies',
  reading_plan: 'Reading plans',
  routine: 'Routines',
  goal: 'Goals',
};

/** The form field value: `kind:id`, or empty for no link. */
export type HabitLinkValue = `${HabitLinkKind}:${string}` | '';

export type HabitLinkOption = { kind: HabitLinkKind; id: string; title: string };

export type HabitLinkColumns = {
  courseId: string | null;
  subjectId: string | null;
  bibleStudyId: string | null;
  readingPlanId: string | null;
  routineId: string | null;
  goalId: string | null;
};

const COLUMN_BY_KIND: Record<HabitLinkKind, keyof HabitLinkColumns> = {
  course: 'courseId',
  subject: 'subjectId',
  bible_study: 'bibleStudyId',
  reading_plan: 'readingPlanId',
  routine: 'routineId',
  goal: 'goalId',
};

export function linkValue(kind: HabitLinkKind, id: string): HabitLinkValue {
  return `${kind}:${id}`;
}

export function parseLinkValue(value: string | undefined | null): {
  kind: HabitLinkKind;
  id: string;
} | null {
  if (!value) return null;
  const i = value.indexOf(':');
  if (i < 0) return null;
  const kind = value.slice(0, i) as HabitLinkKind;
  const id = value.slice(i + 1);
  if (!HABIT_LINK_KINDS.includes(kind) || !id) return null;
  return { kind, id };
}

/** The columns to store for one link; every other link column is cleared. */
export function linkColumns(link: { kind: HabitLinkKind; id: string } | null): HabitLinkColumns {
  const out: HabitLinkColumns = {
    courseId: null,
    subjectId: null,
    bibleStudyId: null,
    readingPlanId: null,
    routineId: null,
    goalId: null,
  };
  if (link) out[COLUMN_BY_KIND[link.kind]] = link.id;
  return out;
}

/** The one link a stored habit carries, if any. */
export function linkOf(row: HabitLinkColumns): { kind: HabitLinkKind; id: string } | null {
  for (const kind of HABIT_LINK_KINDS) {
    const id = row[COLUMN_BY_KIND[kind]];
    if (id) return { kind, id };
  }
  return null;
}

export function linkHref(link: { kind: HabitLinkKind; id: string }): string {
  switch (link.kind) {
    case 'course':
      return `/study/courses/${link.id}`;
    case 'subject':
      return '/study';
    case 'bible_study':
      return `/bible/${link.id}`;
    case 'reading_plan':
      return '/bible';
    case 'routine':
      return '/routines';
    case 'goal':
      return `/goals/${link.id}`;
  }
}

export type PlanItemLike = {
  id: string;
  title: string;
  plannedDate: string | null;
  sortOrder: number;
  completedAt: Date | null;
};

/**
 * The item to do next: anything dated for today or earlier first (oldest
 * first), then the undated queue in order, then the nearest future item.
 */
export function nextPlanItem<T extends PlanItemLike>(items: T[], todayKey: string): T | null {
  const open = items.filter((i) => i.completedAt === null);
  const due = open
    .filter((i) => i.plannedDate !== null && i.plannedDate <= todayKey)
    .sort((a, b) => a.plannedDate!.localeCompare(b.plannedDate!) || a.sortOrder - b.sortOrder);
  if (due[0]) return due[0];
  const queued = open
    .filter((i) => i.plannedDate === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (queued[0]) return queued[0];
  const future = open
    .filter((i) => i.plannedDate !== null)
    .sort((a, b) => a.plannedDate!.localeCompare(b.plannedDate!) || a.sortOrder - b.sortOrder);
  return future[0] ?? null;
}
