import 'server-only';
import { addDays, startOfDay } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { and, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import {
  captures,
  lifeSegments,
  projects,
  tasks,
  timeBlockTemplates,
  timeBlocks,
  timeEntries,
  type TemplateBlock,
} from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { toDateKey, weekRange, type WeekStartsOn } from '@/lib/dates';
import { analyseRange, type WeekAnalysis } from './analysis';
import { expandTimeBlocks, type TimeBlockItem } from './expand';
import {
  listTimeBlockTemplates,
  listTimeBlocksBetween,
  listTimeEntriesBetween,
  type TimeBlock,
  type TimeBlockTemplate,
  type TimeEntry,
} from './queries';
import {
  presetToRRule,
  rruleToPreset,
  type ActivityType,
  type BlockInput,
  type BlockRecurrence,
  type EntryInput,
  type MoveBlockInput,
  type TemplateApplyInput,
  type TemplateSaveInput,
  type TimerStartInput,
} from './schema';

/** Template blocks also remember their segment and project when they have one. */
type StoredTemplateBlock = TemplateBlock & { lifeSegmentId?: string; projectId?: string | null };

async function assertOwnedRefs(
  userId: string,
  lifeSegmentId: string,
  projectId?: string,
  taskId?: string
) {
  const [seg] = await db
    .select({ id: lifeSegments.id })
    .from(lifeSegments)
    .where(and(eq(lifeSegments.userId, userId), eq(lifeSegments.id, lifeSegmentId)))
    .limit(1);
  if (!seg) throw new ValidationError('Choose one of your Life Segments.');
  if (projectId) {
    const [p] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
      .limit(1);
    if (!p) throw new ValidationError('Choose one of your projects.');
  }
  if (taskId) {
    const [t] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, taskId)))
      .limit(1);
    if (!t) throw new ValidationError('Choose one of your tasks.');
  }
}

function blockTimes(input: BlockInput, timeZone: string): { startsAt: Date; endsAt: Date } {
  const startsAt = fromZonedTime(input.startsAt, timeZone);
  const endsAt =
    input.duration === 'custom'
      ? fromZonedTime(input.endsAt!, timeZone)
      : new Date(startsAt.getTime() + Number(input.duration) * 60000);
  if (endsAt <= startsAt) throw new ValidationError('The end must be after the start.');
  return { startsAt, endsAt };
}

// ───────────────────────── blocks ─────────────────────────

export async function getBlock(userId: string, id: string): Promise<TimeBlock> {
  const [row] = await db
    .select()
    .from(timeBlocks)
    .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, id), isNull(timeBlocks.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('That time block does not exist.');
  return row;
}

export async function createBlock(
  userId: string,
  input: BlockInput,
  timeZone: string
): Promise<TimeBlock> {
  await assertOwnedRefs(userId, input.lifeSegmentId, input.projectId, input.taskId);
  const { startsAt, endsAt } = blockTimes(input, timeZone);
  const rrule = presetToRRule(input.recurrence);
  const [row] = await db
    .insert(timeBlocks)
    .values({
      userId,
      title: input.title,
      activityType: input.activityType,
      lifeSegmentId: input.lifeSegmentId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      startsAt,
      endsAt,
      rrule,
      dtstart: rrule ? startsAt : null,
    })
    .returning();
  return row;
}

export async function updateBlock(
  userId: string,
  id: string,
  input: BlockInput,
  timeZone: string
): Promise<TimeBlock> {
  await getBlock(userId, id);
  await assertOwnedRefs(userId, input.lifeSegmentId, input.projectId, input.taskId);
  const { startsAt, endsAt } = blockTimes(input, timeZone);
  const rrule = presetToRRule(input.recurrence);
  const [row] = await db
    .update(timeBlocks)
    .set({
      title: input.title,
      activityType: input.activityType,
      lifeSegmentId: input.lifeSegmentId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      startsAt,
      endsAt,
      rrule,
      dtstart: rrule ? startsAt : null,
    })
    .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, id)))
    .returning();
  return row;
}

/** Drag or resize. Moving a recurring definition moves the whole series. */
export async function moveBlock(userId: string, input: MoveBlockInput): Promise<TimeBlock> {
  const current = await getBlock(userId, input.id);
  const startsAt = new Date(input.start);
  const previous = current.endsAt.getTime() - current.startsAt.getTime();
  const endsAt = input.end ? new Date(input.end) : new Date(startsAt.getTime() + previous);
  if (Number.isNaN(startsAt.getTime()) || endsAt <= startsAt)
    throw new ValidationError('That time range is not valid.');
  const [row] = await db
    .update(timeBlocks)
    .set({ startsAt, endsAt, dtstart: current.rrule ? startsAt : null })
    .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, input.id)))
    .returning();
  return row;
}

export async function removeBlock(userId: string, id: string): Promise<void> {
  await getBlock(userId, id);
  await db
    .update(timeBlocks)
    .set({ deletedAt: new Date() })
    .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.id, id)));
}

export type BlockFormValues = {
  id: string;
  title: string;
  activityType: ActivityType;
  lifeSegmentId: string;
  projectId: string;
  taskId: string;
  startsAt: string;
  duration: string;
  endsAt: string;
  recurrence: BlockRecurrence;
};

/** Form defaults for editing, with instants rendered in the user's zone for `datetime-local`. */
export function toBlockFormValues(row: TimeBlock, timeZone: string): BlockFormValues {
  const local = (d: Date) => formatInTimeZone(d, timeZone, "yyyy-MM-dd'T'HH:mm");
  const minutes = Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60000);
  const preset = [15, 30, 60, 120, 180].includes(minutes) ? String(minutes) : 'custom';
  return {
    id: row.id,
    title: row.title,
    activityType: row.activityType,
    lifeSegmentId: row.lifeSegmentId,
    projectId: row.projectId ?? '',
    taskId: row.taskId ?? '',
    startsAt: local(row.startsAt),
    duration: preset,
    endsAt: local(row.endsAt),
    recurrence: rruleToPreset(row.rrule),
  };
}

// ───────────────────────── entries and timer ─────────────────────────

export type TimeEntryItem = {
  id: string;
  /** ISO instants; `end` is the clock position for a running entry. */
  start: string;
  end: string;
  running: boolean;
  durationMinutes: number;
  segmentId: string;
  projectId: string | null;
  taskId: string | null;
  timeBlockId: string | null;
  note: string | null;
  activityType: ActivityType | null;
};

function entryTimes(input: EntryInput, timeZone: string): { startedAt: Date; endedAt: Date } {
  const startedAt = fromZonedTime(input.startedAt, timeZone);
  const endedAt = input.endedAt
    ? fromZonedTime(input.endedAt, timeZone)
    : new Date(startedAt.getTime() + (input.durationMinutes ?? 0) * 60000);
  if (endedAt <= startedAt) throw new ValidationError('The end must be after the start.');
  return { startedAt, endedAt };
}

const minutesOf = (start: Date, end: Date) =>
  Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

export async function getEntry(userId: string, id: string): Promise<TimeEntry> {
  const [row] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, userId), eq(timeEntries.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('That time entry does not exist.');
  return row;
}

export async function createEntry(
  userId: string,
  input: EntryInput,
  timeZone: string
): Promise<TimeEntry> {
  await assertOwnedRefs(userId, input.lifeSegmentId, input.projectId, input.taskId);
  if (input.timeBlockId) await getBlock(userId, input.timeBlockId);
  const { startedAt, endedAt } = entryTimes(input, timeZone);
  const [row] = await db
    .insert(timeEntries)
    .values({
      userId,
      lifeSegmentId: input.lifeSegmentId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      timeBlockId: input.timeBlockId ?? null,
      startedAt,
      endedAt,
      durationMinutes: minutesOf(startedAt, endedAt),
      note: input.note ?? null,
    })
    .returning();
  return row;
}

export async function updateEntry(
  userId: string,
  id: string,
  input: EntryInput,
  timeZone: string
): Promise<TimeEntry> {
  await getEntry(userId, id);
  await assertOwnedRefs(userId, input.lifeSegmentId, input.projectId, input.taskId);
  const { startedAt, endedAt } = entryTimes(input, timeZone);
  const [row] = await db
    .update(timeEntries)
    .set({
      lifeSegmentId: input.lifeSegmentId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      timeBlockId: input.timeBlockId ?? null,
      startedAt,
      endedAt,
      durationMinutes: minutesOf(startedAt, endedAt),
      note: input.note ?? null,
    })
    .where(and(eq(timeEntries.userId, userId), eq(timeEntries.id, id)))
    .returning();
  return row;
}

export async function removeEntry(userId: string, id: string): Promise<void> {
  await getEntry(userId, id);
  await db.delete(timeEntries).where(and(eq(timeEntries.userId, userId), eq(timeEntries.id, id)));
}

/** The entry still running (no end), newest first, or null. */
export async function getRunningEntry(userId: string): Promise<TimeEntry | null> {
  const [row] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, userId), isNull(timeEntries.endedAt)))
    .orderBy(desc(timeEntries.startedAt))
    .limit(1);
  return row ?? null;
}

/** Starts a timer. Any entry already running is stopped first, so only one runs at a time. */
export async function startTimer(userId: string, input: TimerStartInput): Promise<TimeEntry> {
  await assertOwnedRefs(userId, input.lifeSegmentId, input.projectId, input.taskId);
  if (input.timeBlockId) await getBlock(userId, input.timeBlockId);
  const running = await getRunningEntry(userId);
  if (running) await stopTimer(userId, running.id);
  const [row] = await db
    .insert(timeEntries)
    .values({
      userId,
      lifeSegmentId: input.lifeSegmentId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      timeBlockId: input.timeBlockId ?? null,
      startedAt: new Date(),
      endedAt: null,
      durationMinutes: null,
      note: input.note ?? null,
    })
    .returning();
  return row;
}

export async function stopTimer(userId: string, id: string): Promise<TimeEntry> {
  const current = await getEntry(userId, id);
  if (current.endedAt) return current;
  const endedAt = new Date();
  const [row] = await db
    .update(timeEntries)
    .set({ endedAt, durationMinutes: minutesOf(current.startedAt, endedAt) })
    .where(and(eq(timeEntries.userId, userId), eq(timeEntries.id, id)))
    .returning();
  return row;
}

export type EntryFormValues = {
  id: string;
  lifeSegmentId: string;
  projectId: string;
  taskId: string;
  timeBlockId: string;
  startedAt: string;
  endedAt: string;
  note: string;
};

export function toEntryFormValues(row: TimeEntry, timeZone: string): EntryFormValues {
  const local = (d: Date | null) => (d ? formatInTimeZone(d, timeZone, "yyyy-MM-dd'T'HH:mm") : '');
  return {
    id: row.id,
    lifeSegmentId: row.lifeSegmentId,
    projectId: row.projectId ?? '',
    taskId: row.taskId ?? '',
    timeBlockId: row.timeBlockId ?? '',
    startedAt: local(row.startedAt),
    endedAt: local(row.endedAt),
    note: row.note ?? '',
  };
}

// ───────────────────────── range data for the grid ─────────────────────────

export type StickyNote = { id: string; text: string; pinnedDate: string };

export type TimeRangeData = {
  from: string;
  to: string;
  blocks: TimeBlockItem[];
  entries: TimeEntryItem[];
  stickies: StickyNote[];
  analysis: WeekAnalysis;
};

export async function listStickies(
  userId: string,
  fromKey: string,
  toKey: string
): Promise<StickyNote[]> {
  const rows = await db
    .select({ id: captures.id, text: captures.text, pinnedDate: captures.pinnedDate })
    .from(captures)
    .where(
      and(
        eq(captures.userId, userId),
        isNull(captures.convertedAt),
        gte(captures.pinnedDate, fromKey),
        lte(captures.pinnedDate, toKey)
      )
    )
    .orderBy(captures.pinnedDate, captures.createdAt);
  return rows.map((r) => ({ id: r.id, text: r.text, pinnedDate: r.pinnedDate! }));
}

/** Everything the time-blocking page draws for [from, to). */
export async function buildTimeRange(
  userId: string,
  from: Date,
  to: Date,
  timeZone: string
): Promise<TimeRangeData> {
  const [blockRows, entryRows, stickies] = await Promise.all([
    listTimeBlocksBetween(userId, from, to),
    listTimeEntriesBetween(userId, from, to),
    listStickies(
      userId,
      formatInTimeZone(from, timeZone, 'yyyy-MM-dd'),
      formatInTimeZone(new Date(to.getTime() - 1), timeZone, 'yyyy-MM-dd')
    ),
  ]);
  const blocks = expandTimeBlocks(blockRows, from, to);
  // Recurring definitions (whose own startsAt may be outside the range) are
  // not returned by the range query; fetch them separately.
  const recurring = await db
    .select()
    .from(timeBlocks)
    .where(
      and(
        eq(timeBlocks.userId, userId),
        isNull(timeBlocks.deletedAt),
        // rrule is not null and the definition started before the range ends
        lte(timeBlocks.startsAt, to)
      )
    );
  const extra = recurring.filter((r) => r.rrule && !blockRows.some((b) => b.id === r.id));
  for (const item of expandTimeBlocks(extra, from, to)) blocks.push(item);
  blocks.sort((a, b) => a.start.localeCompare(b.start));

  const activityByBlock = new Map<string, ActivityType>();
  for (const b of [...blockRows, ...extra]) activityByBlock.set(b.id, b.activityType);
  const now = new Date();
  const entries: TimeEntryItem[] = entryRows.map((e) => {
    const end = e.endedAt ?? now;
    return {
      id: e.id,
      start: e.startedAt.toISOString(),
      end: end.toISOString(),
      running: !e.endedAt,
      durationMinutes: e.durationMinutes ?? minutesOf(e.startedAt, end),
      segmentId: e.lifeSegmentId,
      projectId: e.projectId,
      taskId: e.taskId,
      timeBlockId: e.timeBlockId,
      note: e.note,
      activityType: e.timeBlockId ? (activityByBlock.get(e.timeBlockId) ?? null) : null,
    };
  });
  const analysis = analyseRange(
    blocks,
    entryRows.map((e) => ({
      startedAt: e.startedAt,
      endedAt: e.endedAt,
      durationMinutes: e.durationMinutes,
      lifeSegmentId: e.lifeSegmentId,
      projectId: e.projectId,
      activityType: e.timeBlockId ? (activityByBlock.get(e.timeBlockId) ?? null) : null,
    })),
    from,
    to,
    timeZone,
    now
  );
  return { from: from.toISOString(), to: to.toISOString(), blocks, entries, stickies, analysis };
}

// ───────────────────────── templates ─────────────────────────

/** [from, to) instants for the local day or week that contains `dateKey`. */
export function rangeFor(
  kind: 'day' | 'week',
  dateKey: string,
  timeZone: string,
  weekStartsOn: WeekStartsOn
): { from: Date; to: Date } {
  const localDay = startOfDay(toZonedTime(fromZonedTime(`${dateKey}T12:00`, timeZone), timeZone));
  if (kind === 'day') {
    return {
      from: fromZonedTime(`${dateKey}T00:00`, timeZone),
      to: fromZonedTime(`${toDateKey(addDays(localDay, 1))}T00:00`, timeZone),
    };
  }
  const { start } = weekRange(localDay, weekStartsOn);
  return {
    from: fromZonedTime(`${toDateKey(start)}T00:00`, timeZone),
    to: fromZonedTime(`${toDateKey(addDays(start, 7))}T00:00`, timeZone),
  };
}

export async function saveTemplateFromRange(
  userId: string,
  input: TemplateSaveInput,
  timeZone: string,
  weekStartsOn: WeekStartsOn
): Promise<TimeBlockTemplate> {
  const { from, to } = rangeFor(input.kind, input.date, timeZone, weekStartsOn);
  const rows = await listTimeBlocksBetween(userId, from, to);
  const items = expandTimeBlocks(rows, from, to);
  if (items.length === 0) throw new ValidationError('There are no blocks in that range to save.');
  const blocks: StoredTemplateBlock[] = items.map((i) => {
    const start = new Date(i.start);
    const end = new Date(i.end);
    const block: StoredTemplateBlock = {
      start: formatInTimeZone(start, timeZone, 'HH:mm'),
      end: formatInTimeZone(end, timeZone, 'HH:mm'),
      activityType: i.activityType,
      title: i.title,
      lifeSegmentId: i.segmentId,
      projectId: i.projectId,
    };
    if (input.kind === 'week') block.dayOfWeek = toZonedTime(start, timeZone).getDay();
    return block;
  });
  const [row] = await db
    .insert(timeBlockTemplates)
    .values({ userId, name: input.name, kind: input.kind, blocks })
    .onConflictDoUpdate({
      target: [timeBlockTemplates.userId, timeBlockTemplates.name],
      set: { kind: input.kind, blocks },
    })
    .returning();
  return row;
}

export async function applyTemplate(
  userId: string,
  input: TemplateApplyInput,
  timeZone: string,
  weekStartsOn: WeekStartsOn
): Promise<number> {
  const [template] = await db
    .select()
    .from(timeBlockTemplates)
    .where(and(eq(timeBlockTemplates.userId, userId), eq(timeBlockTemplates.id, input.id)))
    .limit(1);
  if (!template) throw new NotFoundError('That template does not exist.');
  await assertOwnedRefs(userId, input.lifeSegmentId);
  const owned = new Set(
    (
      await db
        .select({ id: lifeSegments.id })
        .from(lifeSegments)
        .where(eq(lifeSegments.userId, userId))
    ).map((s) => s.id)
  );
  const ownedProjects = new Set(
    (await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, userId))).map(
      (p) => p.id
    )
  );

  const localDay = startOfDay(
    toZonedTime(fromZonedTime(`${input.date}T12:00`, timeZone), timeZone)
  );
  const weekStart = weekRange(localDay, weekStartsOn).start;
  const values = (template.blocks as StoredTemplateBlock[]).map((b) => {
    const day =
      template.kind === 'week' && b.dayOfWeek !== undefined
        ? addDays(weekStart, (b.dayOfWeek - weekStartsOn + 7) % 7)
        : localDay;
    const key = toDateKey(day);
    const startsAt = fromZonedTime(`${key}T${b.start}`, timeZone);
    let endsAt = fromZonedTime(`${key}T${b.end}`, timeZone);
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24 * 60 * 60000);
    return {
      userId,
      title: b.title,
      activityType: b.activityType,
      lifeSegmentId:
        b.lifeSegmentId && owned.has(b.lifeSegmentId) ? b.lifeSegmentId : input.lifeSegmentId,
      projectId: b.projectId && ownedProjects.has(b.projectId) ? b.projectId : null,
      taskId: null,
      startsAt,
      endsAt,
    };
  });
  if (values.length === 0) return 0;
  await db.insert(timeBlocks).values(values);
  return values.length;
}

export async function removeTemplate(userId: string, id: string): Promise<void> {
  await db
    .delete(timeBlockTemplates)
    .where(and(eq(timeBlockTemplates.userId, userId), eq(timeBlockTemplates.id, id)));
}

export async function listTemplates(userId: string) {
  return listTimeBlockTemplates(userId);
}

/** Open tasks for the block and entry pickers, newest due first. */
export async function listTaskOptions(
  userId: string
): Promise<Array<{ id: string; title: string; lifeSegmentId: string }>> {
  return db
    .select({ id: tasks.id, title: tasks.title, lifeSegmentId: tasks.lifeSegmentId })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        inArray(tasks.status, ['todo', 'in_progress'])
      )
    )
    .orderBy(tasks.dueDate, tasks.createdAt)
    .limit(200);
}
