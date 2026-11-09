import { z } from 'zod';

export const NOTE_KINDS = ['note', 'quote'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const noteInput = z.object({
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  kind: z.enum(NOTE_KINDS).default('note'),
  title: z.string().trim().max(160).optional(),
  content: z.string().trim().min(1, 'Write something first.').max(20_000),
  author: z.string().trim().max(160).optional(),
  source: z.string().trim().max(200).optional(),
  isPinned: z.coerce.boolean().default(false),
});
export type NoteInput = z.infer<typeof noteInput>;
