import { z } from 'zod';

export const captureInput = z.object({
  text: z.string().trim().min(1, 'Write something to capture.').max(500),
});

export const convertCaptureInput = z.object({
  id: z.uuid(),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  title: z.string().trim().min(1).max(200).optional(),
});

/** A sticky note: a capture pinned to a day on the time-blocking view. */
export const stickyInput = z.object({
  text: z.string().trim().min(1, 'Write something to pin.').max(500),
  pinnedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a day.'),
});
