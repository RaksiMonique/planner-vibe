import { z } from 'zod';
import { parseTags } from './tags';

export const NOTE_KINDS = ['note', 'quote'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

const optionalUuid = z.preprocess((v) => (v === '' ? undefined : v), z.uuid().optional());

export const noteInput = z.object({
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  kind: z.enum(NOTE_KINDS).default('note'),
  title: z.string().trim().max(160).optional(),
  content: z.string().trim().min(1, 'Write something first.').max(20_000),
  author: z.string().trim().max(160).optional(),
  source: z.string().trim().max(200).optional(),
  /** The book or other item it came from, from the media tracker. */
  mediaItemId: optionalUuid,
  /** Why it matters to the user; the line that keeps a saved note meaningful. */
  why: z.string().trim().max(2000).optional(),
  /** One comma-separated line; stored as a list. */
  tags: z.preprocess((v) => parseTags(typeof v === 'string' ? v : undefined), z.array(z.string())),
  isPinned: z.coerce.boolean().default(false),
});
export type NoteInput = z.infer<typeof noteInput>;
