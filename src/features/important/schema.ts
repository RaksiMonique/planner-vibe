import { z } from 'zod';
import { IMPORTANT_KINDS } from './kinds';

export const recordInput = z.object({
  kind: z.enum(IMPORTANT_KINDS),
  title: z.string().trim().min(1, 'Give it a title.').max(160),
  notes: z.string().trim().max(4000).optional(),
  isSensitive: z.boolean().default(false),
});
export type RecordInput = z.infer<typeof recordInput>;
