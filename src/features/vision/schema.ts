import { z } from 'zod';

export const VISION_CATEGORIES = [
  'Seasonal',
  'Home renovation',
  'Lifestyle',
  'Long-term vision',
  'Travel',
  'Style',
] as const;

export const ITEM_KINDS = ['image', 'quote', 'link'] as const;
export type VisionItemKind = (typeof ITEM_KINDS)[number];

const optionalUuid = z.preprocess((v) => (v === '' ? undefined : v), z.uuid().optional());
const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .refine((v) => !v || /^https?:\/\//i.test(v), 'Use a full address starting with http.');

export const boardInput = z.object({
  name: z.string().trim().min(1, 'Name the board.').max(120),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(80).optional(),
  goalId: optionalUuid,
  projectId: optionalUuid,
});
export type BoardInput = z.infer<typeof boardInput>;

export const itemInput = z
  .object({
    kind: z.enum(ITEM_KINDS).default('image'),
    caption: z.string().trim().max(300).optional(),
    url: optionalUrl,
    quoteText: z.string().trim().max(1000).optional(),
    author: z.string().trim().max(120).optional(),
    goalId: optionalUuid,
    projectId: optionalUuid,
  })
  .refine((d) => d.kind !== 'quote' || !!d.quoteText, {
    message: 'Write the quote.',
    path: ['quoteText'],
  })
  .refine((d) => d.kind !== 'link' || !!d.url, { message: 'Add the link.', path: ['url'] });
export type ItemInput = z.infer<typeof itemInput>;

export const captionInput = z.object({
  id: z.uuid(),
  caption: z.string().trim().max(300).optional(),
});
