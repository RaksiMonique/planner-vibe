import { z } from 'zod';

/** The old app's `secondBrainData` export (instructions.md, Starting point). Lenient on purpose. */
const legacyTask = z.looseObject({
  id: z.union([z.number(), z.string()]),
  title: z.string(),
  dueDate: z.string().nullish(),
  priority: z.coerce.number().nullish(),
  segment: z.string().nullish(),
  completed: z.boolean().nullish(),
  done: z.boolean().nullish(),
});

const legacyHabit = z.looseObject({
  name: z.string(),
  goal: z.coerce.number().nullish(),
  logs: z.array(z.union([z.number(), z.string()])).default([]),
});

const legacyGoal = z.looseObject({ text: z.string(), done: z.boolean().nullish() });

const legacyId = z.union([z.number(), z.string()]);

export const legacyBibleStudy = z.looseObject({
  id: legacyId,
  name: z.string(),
  type: z.string().nullish(),
  priority: z.string().nullish(),
  status: z.string().nullish(),
  bible: z.string().nullish(),
  prereqId: legacyId.nullish(),
});

export const legacyStudy = z.looseObject({
  id: legacyId,
  title: z.string(),
  category: z.string().nullish(),
  deadline: z.string().nullish(),
  progress: z.coerce.number().nullish(),
  notes: z.string().nullish(),
});

export const legacyQuote = z.looseObject({
  id: legacyId,
  text: z.string(),
  source: z.string().nullish(),
  author: z.string().nullish(),
  type: z.string().nullish(),
});

/** Sections that may be null or missing in older exports. */
const list = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((v) => v ?? []);
const map = <T extends z.ZodTypeAny>(item: T) =>
  z
    .record(z.string(), item)
    .nullish()
    .transform((v) => v ?? {});

export const legacyExport = z.looseObject({
  tasks: z.array(legacyTask).default([]),
  habits: z.array(legacyHabit).default([]),
  segments: z.record(z.string(), z.array(legacyGoal)).default({}),
  routines: z
    .looseObject({
      morning: z.array(z.string()).default([]),
      evening: z.array(z.string()).default([]),
    })
    .default({ morning: [], evening: [] }),
  bibleStudies: list(z.unknown()),
  studies: list(z.unknown()),
  recipes: list(z.unknown()),
  mealPlan: map(z.unknown()),
  journal: map(z.unknown()),
  quotes: list(z.unknown()),
});
export type LegacyExport = z.infer<typeof legacyExport>;
