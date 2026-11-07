import { z } from 'zod';
import { REVIEW_KINDS } from './templates';

export const dateKeyValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');

export const openReviewInput = z.object({
  kind: z.enum(REVIEW_KINDS),
  date: dateKeyValue.optional(),
  goalId: z.uuid().optional(),
});
export type OpenReviewInput = z.infer<typeof openReviewInput>;

export const saveReviewInput = z.object({
  id: z.uuid(),
  summary: z.string().trim().max(5_000).optional(),
  complete: z.enum(['1', '0']).optional(),
});

export const autosaveInput = z.object({
  id: z.uuid(),
  promptId: z
    .string()
    .regex(/^[a-z_]{1,40}$/)
    .max(40),
  value: z.string().max(20_000),
});

/** Pulls `answer:<promptId>` fields out of a parsed form. */
export function answersFromValues(values: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (!k.startsWith('answer:')) continue;
    const id = k.slice('answer:'.length);
    if (!/^[a-z_]{1,40}$/.test(id)) continue;
    out[id] = typeof v === 'string' ? v : '';
  }
  return out;
}
