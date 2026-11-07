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
  bibleStudies: z.array(z.unknown()).default([]),
  studies: z.array(z.unknown()).default([]),
  recipes: z.array(z.unknown()).default([]),
  mealPlan: z.record(z.string(), z.unknown()).default({}),
  journal: z.record(z.string(), z.unknown()).default({}),
  quotes: z.array(z.unknown()).default([]),
});
export type LegacyExport = z.infer<typeof legacyExport>;
