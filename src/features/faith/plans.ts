import { BIBLE_BOOKS, bookById } from './bible-books';

export type PlanLike = {
  /** Ordered book ids, or null for the whole canon. */
  bookIds: number[] | null;
  chaptersPerDay: number;
  /** yyyy-MM-dd */
  startDate: string;
};
export type PlanChapter = { bookId: number; chapter: number };

export const PLAN_PRESETS = {
  whole: { label: 'The whole Bible', bookIds: null as number[] | null },
  new_testament: { label: 'New Testament', bookIds: range(47, 73) },
  gospels: { label: 'The four Gospels', bookIds: range(47, 50) },
  psalms: { label: 'Psalms', bookIds: [23] },
  custom: { label: 'Choose books', bookIds: [] as number[] },
} as const;
export type PlanPreset = keyof typeof PLAN_PRESETS;

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

export const chapterKey = (c: PlanChapter) => `${c.bookId}:${c.chapter}`;

/** Every chapter of the plan in reading order. */
export function planChapters(bookIds: number[] | null): PlanChapter[] {
  const ids = bookIds ?? BIBLE_BOOKS.map((b) => b.id);
  const out: PlanChapter[] = [];
  for (const id of ids) {
    const book = bookById(id);
    if (!book) continue;
    for (let chapter = 1; chapter <= book.chapters; chapter++) out.push({ bookId: id, chapter });
  }
  return out;
}

/** Whole days from the start date to the given date; negative before the start. */
export function dayIndex(startDate: string, dateKey: string): number {
  const start = Date.UTC(
    +startDate.slice(0, 4),
    +startDate.slice(5, 7) - 1,
    +startDate.slice(8, 10)
  );
  const day = Date.UTC(+dateKey.slice(0, 4), +dateKey.slice(5, 7) - 1, +dateKey.slice(8, 10));
  return Math.floor((day - start) / 86_400_000);
}

/** The chapters the schedule assigns to one day, skipping nothing. */
export function scheduledForDay(plan: PlanLike, dateKey: string): PlanChapter[] {
  const index = dayIndex(plan.startDate, dateKey);
  if (index < 0) return [];
  const chapters = planChapters(plan.bookIds);
  const per = Math.max(1, plan.chaptersPerDay);
  return chapters.slice(index * per, (index + 1) * per);
}

/** How many chapters the schedule expects to be read by the end of a day. */
export function expectedReadBy(plan: PlanLike, dateKey: string, total: number): number {
  const index = dayIndex(plan.startDate, dateKey);
  if (index < 0) return 0;
  return Math.min(total, (index + 1) * Math.max(1, plan.chaptersPerDay));
}

/** The next unread chapters in order, so a plan that runs behind keeps working. */
export function nextReading(
  chapters: PlanChapter[],
  readKeys: Set<string>,
  count: number
): PlanChapter[] {
  const out: PlanChapter[] = [];
  for (const c of chapters) {
    if (readKeys.has(chapterKey(c))) continue;
    out.push(c);
    if (out.length >= count) break;
  }
  return out;
}

export type PlanProgress = {
  read: number;
  total: number;
  percent: number;
  /** Chapters behind (positive) or ahead (negative) of the schedule. */
  behind: number;
  remainingDays: number;
};

export function planProgress(plan: PlanLike, readKeys: Set<string>, dateKey: string): PlanProgress {
  const chapters = planChapters(plan.bookIds);
  const total = chapters.length;
  const read = chapters.filter((c) => readKeys.has(chapterKey(c))).length;
  const per = Math.max(1, plan.chaptersPerDay);
  return {
    read,
    total,
    percent: total === 0 ? 0 : Math.round((read / total) * 100),
    behind: expectedReadBy(plan, dateKey, total) - read,
    remainingDays: Math.ceil((total - read) / per),
  };
}

/** "John 3" or "Genesis 1-3" for a run of consecutive chapters in one book. */
export function describeChapters(chapters: PlanChapter[]): string {
  if (chapters.length === 0) return '';
  const groups: Array<{ bookId: number; from: number; to: number }> = [];
  for (const c of chapters) {
    const last = groups[groups.length - 1];
    if (last && last.bookId === c.bookId && last.to === c.chapter - 1) last.to = c.chapter;
    else groups.push({ bookId: c.bookId, from: c.chapter, to: c.chapter });
  }
  return groups
    .map((g) => {
      const name = bookById(g.bookId)?.name ?? '';
      return g.from === g.to ? `${name} ${g.from}` : `${name} ${g.from}-${g.to}`;
    })
    .join(', ');
}

// ── Queue ────────────────────────────────────────────────────────────────────

export type QueueLike = {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'done';
  startsAfterPlanId: string | null;
};

/** The plan `plan` is still waiting on: present in `plans` and not finished. */
export function queuedBehind<T extends QueueLike>(
  plan: QueueLike,
  plans: readonly T[]
): T | undefined {
  if (!plan.startsAfterPlanId) return undefined;
  const before = plans.find((p) => p.id === plan.startsAfterPlanId);
  return before && before.status !== 'done' ? before : undefined;
}

/** Plans a new plan may queue behind: unfinished, with nothing queued behind them yet. */
export function queueTargets<T extends QueueLike>(plans: readonly T[]): T[] {
  return plans.filter(
    (p) => p.status !== 'done' && !plans.some((q) => q.startsAfterPlanId === p.id)
  );
}
