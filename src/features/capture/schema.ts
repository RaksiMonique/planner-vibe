import { z } from 'zod';

export const captureInput = z.object({
  text: z.string().trim().min(1, 'Write something to capture.').max(500),
});

export const convertCaptureInput = z.object({
  id: z.uuid(),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  title: z.string().trim().min(1).max(200).optional(),
  /** What the capture becomes; the Inbox offers all three. */
  as: z.enum(['task', 'note', 'quote']).default('task'),
  /** Filing as a quote keeps the source and the reason in the same step. */
  author: z.string().trim().max(160).optional(),
  source: z.string().trim().max(200).optional(),
  why: z.string().trim().max(2000).optional(),
  tags: z.string().trim().max(500).optional(),
});
export type ConvertCaptureInput = z.infer<typeof convertCaptureInput>;

/** A sticky note: a capture pinned to a day on the time-blocking view. */
export const stickyInput = z.object({
  text: z.string().trim().min(1, 'Write something to pin.').max(500),
  pinnedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a day.'),
});
