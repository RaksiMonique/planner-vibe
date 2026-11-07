import { z } from 'zod';

export const captureInput = z.object({
  text: z.string().trim().min(1, 'Write something to capture.').max(500),
});

export const convertCaptureInput = z.object({
  id: z.uuid(),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  title: z.string().trim().min(1).max(200).optional(),
});
