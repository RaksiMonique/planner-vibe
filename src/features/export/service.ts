import 'server-only';
import { eq } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import * as s from '@/db/schema';

type UserOwnedTable = PgTable & { userId: PgColumn };

/** Every planner table's rows for one user, keyed by table name. */
export async function exportPlannerData(userId: string) {
  const byUser = (table: UserOwnedTable) => db.select().from(table).where(eq(table.userId, userId));

  const [profile] = await db.select().from(s.profiles).where(eq(s.profiles.id, userId));
  const data = {
    exportedAt: new Date().toISOString(),
    format: 'planner-v1',
    profile: profile ?? null,
    userPreferences: await byUser(s.userPreferences),
    lifeSegments: await byUser(s.lifeSegments),
    tags: await byUser(s.tags),
    tagAssignments: await byUser(s.tagAssignments),
    goals: await byUser(s.goals),
    goalProjects: await byUser(s.goalProjects),
    projects: await byUser(s.projects),
    milestones: await byUser(s.milestones),
    tasks: await byUser(s.tasks),
    taskDependencies: await byUser(s.taskDependencies),
    calendars: await byUser(s.calendars),
    events: await byUser(s.events),
    timeBlocks: await byUser(s.timeBlocks),
    timeBlockTemplates: await byUser(s.timeBlockTemplates),
    habits: await byUser(s.habits),
    habitCheckIns: await byUser(s.habitCheckIns),
    routines: await byUser(s.routines),
    routineSteps: await byUser(s.routineSteps),
    routineCompletions: await byUser(s.routineCompletions),
    moodEntries: await byUser(s.moodEntries),
    timeEntries: await byUser(s.timeEntries),
    captures: await byUser(s.captures),
    legacyMap: await byUser(s.legacyMap),
  };
  return data;
}
