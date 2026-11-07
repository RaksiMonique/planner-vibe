import { relations } from 'drizzle-orm';
import { lifeSegments, tagAssignments, tags } from './organisation';
import { goalProjects, goals, milestones, projects, taskDependencies, tasks } from './planning';
import { profiles, userPreferences } from './profiles';
import { calendars, events, timeBlockTemplates, timeBlocks } from './scheduling';
import { captures } from './system';
import {
  habitCheckIns,
  habits,
  moodEntries,
  routineCompletions,
  routineSteps,
  routines,
  timeEntries,
} from './tracking';

export * from './faith';
export * from './learning';
export * from './legacy';
export * from './media';
export * from './notes';
export * from './organisation';
export * from './planning';
export * from './profiles';
export * from './reflection';
export * from './reminders';
export * from './scheduling';
export * from './system';
export * from './tracking';

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  preferences: one(userPreferences, {
    fields: [profiles.id],
    references: [userPreferences.userId],
  }),
  lifeSegments: many(lifeSegments),
  calendars: many(calendars),
}));

export const lifeSegmentsRelations = relations(lifeSegments, ({ one, many }) => ({
  owner: one(profiles, { fields: [lifeSegments.userId], references: [profiles.id] }),
  goals: many(goals),
  projects: many(projects),
  tasks: many(tasks),
  events: many(events),
  habits: many(habits),
  routines: many(routines),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  assignments: many(tagAssignments),
}));

export const tagAssignmentsRelations = relations(tagAssignments, ({ one }) => ({
  tag: one(tags, { fields: [tagAssignments.tagId], references: [tags.id] }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  lifeSegment: one(lifeSegments, { fields: [goals.lifeSegmentId], references: [lifeSegments.id] }),
  parent: one(goals, {
    fields: [goals.parentGoalId],
    references: [goals.id],
    relationName: 'goal_hierarchy',
  }),
  children: many(goals, { relationName: 'goal_hierarchy' }),
  milestones: many(milestones),
  tasks: many(tasks),
  goalProjects: many(goalProjects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  lifeSegment: one(lifeSegments, {
    fields: [projects.lifeSegmentId],
    references: [lifeSegments.id],
  }),
  tasks: many(tasks),
  milestones: many(milestones),
  goalProjects: many(goalProjects),
  timeBlocks: many(timeBlocks),
}));

export const goalProjectsRelations = relations(goalProjects, ({ one }) => ({
  goal: one(goals, { fields: [goalProjects.goalId], references: [goals.id] }),
  project: one(projects, { fields: [goalProjects.projectId], references: [projects.id] }),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  goal: one(goals, { fields: [milestones.goalId], references: [goals.id] }),
  project: one(projects, { fields: [milestones.projectId], references: [projects.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  lifeSegment: one(lifeSegments, { fields: [tasks.lifeSegmentId], references: [lifeSegments.id] }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  goal: one(goals, { fields: [tasks.goalId], references: [goals.id] }),
  milestone: one(milestones, { fields: [tasks.milestoneId], references: [milestones.id] }),
  parent: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: 'task_subtasks',
  }),
  subtasks: many(tasks, { relationName: 'task_subtasks' }),
  recurrenceParent: one(tasks, {
    fields: [tasks.recurrenceParentId],
    references: [tasks.id],
    relationName: 'task_occurrences',
  }),
  occurrences: many(tasks, { relationName: 'task_occurrences' }),
  dependencies: many(taskDependencies, { relationName: 'task_dependencies' }),
  dependents: many(taskDependencies, { relationName: 'task_dependents' }),
  timeBlocks: many(timeBlocks),
  timeEntries: many(timeEntries),
}));

export const taskDependenciesRelations = relations(taskDependencies, ({ one }) => ({
  task: one(tasks, {
    fields: [taskDependencies.taskId],
    references: [tasks.id],
    relationName: 'task_dependencies',
  }),
  dependsOn: one(tasks, {
    fields: [taskDependencies.dependsOnTaskId],
    references: [tasks.id],
    relationName: 'task_dependents',
  }),
}));

export const calendarsRelations = relations(calendars, ({ one, many }) => ({
  owner: one(profiles, { fields: [calendars.userId], references: [profiles.id] }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  lifeSegment: one(lifeSegments, { fields: [events.lifeSegmentId], references: [lifeSegments.id] }),
  calendar: one(calendars, { fields: [events.calendarId], references: [calendars.id] }),
  task: one(tasks, { fields: [events.taskId], references: [tasks.id] }),
}));

export const timeBlocksRelations = relations(timeBlocks, ({ one, many }) => ({
  lifeSegment: one(lifeSegments, {
    fields: [timeBlocks.lifeSegmentId],
    references: [lifeSegments.id],
  }),
  project: one(projects, { fields: [timeBlocks.projectId], references: [projects.id] }),
  task: one(tasks, { fields: [timeBlocks.taskId], references: [tasks.id] }),
  timeEntries: many(timeEntries),
}));

export const timeBlockTemplatesRelations = relations(timeBlockTemplates, ({ one }) => ({
  owner: one(profiles, { fields: [timeBlockTemplates.userId], references: [profiles.id] }),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  lifeSegment: one(lifeSegments, { fields: [habits.lifeSegmentId], references: [lifeSegments.id] }),
  checkIns: many(habitCheckIns),
  routineSteps: many(routineSteps),
}));

export const habitCheckInsRelations = relations(habitCheckIns, ({ one }) => ({
  habit: one(habits, { fields: [habitCheckIns.habitId], references: [habits.id] }),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  lifeSegment: one(lifeSegments, {
    fields: [routines.lifeSegmentId],
    references: [lifeSegments.id],
  }),
  steps: many(routineSteps),
  completions: many(routineCompletions),
}));

export const routineStepsRelations = relations(routineSteps, ({ one }) => ({
  routine: one(routines, { fields: [routineSteps.routineId], references: [routines.id] }),
  habit: one(habits, { fields: [routineSteps.habitId], references: [habits.id] }),
}));

export const routineCompletionsRelations = relations(routineCompletions, ({ one }) => ({
  routine: one(routines, { fields: [routineCompletions.routineId], references: [routines.id] }),
}));

export const moodEntriesRelations = relations(moodEntries, ({ one }) => ({
  lifeSegment: one(lifeSegments, {
    fields: [moodEntries.lifeSegmentId],
    references: [lifeSegments.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  lifeSegment: one(lifeSegments, {
    fields: [timeEntries.lifeSegmentId],
    references: [lifeSegments.id],
  }),
  project: one(projects, { fields: [timeEntries.projectId], references: [projects.id] }),
  task: one(tasks, { fields: [timeEntries.taskId], references: [tasks.id] }),
  timeBlock: one(timeBlocks, { fields: [timeEntries.timeBlockId], references: [timeBlocks.id] }),
}));

export const capturesRelations = relations(captures, ({ one }) => ({
  owner: one(profiles, { fields: [captures.userId], references: [profiles.id] }),
}));
