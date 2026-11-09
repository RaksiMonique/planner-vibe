import { z } from 'zod';

export const GIFT_STATUSES = ['idea', 'planned', 'purchased', 'wrapped', 'given'] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];
export const GIFT_STATUS_LABELS: Record<GiftStatus, string> = {
  idea: 'Idea',
  planned: 'Planned',
  purchased: 'Purchased',
  wrapped: 'Wrapped',
  given: 'Given',
};

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');
const money = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
  z.number().min(0).max(99_999_999).optional()
);
const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .refine((v) => !v || /^https?:\/\//i.test(v), 'Use a full address starting with http.');

export const recipientInput = z.object({
  name: z.string().trim().min(1, 'Give them a name.').max(120),
  relationship: z.string().trim().max(80).optional(),
  birthday: dateKey.optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type RecipientInput = z.infer<typeof recipientInput>;

export const giftInput = z.object({
  recipientId: z.uuid('Choose who it is for.'),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  title: z.string().trim().min(1, 'What is the gift?').max(200),
  occasion: z.string().trim().max(120).optional(),
  occasionDate: dateKey.optional(),
  status: z.enum(GIFT_STATUSES).default('idea'),
  budget: money,
  price: money,
  url: optionalUrl,
  notes: z.string().trim().max(2000).optional(),
});
export type GiftInput = z.infer<typeof giftInput>;

export const wishlistInput = z.object({
  title: z.string().trim().min(1, 'What do you wish for?').max(200),
  url: optionalUrl,
  price: money,
  priority: z.coerce.number().int().min(1).max(3).default(2),
  notes: z.string().trim().max(2000).optional(),
});
export type WishlistInput = z.infer<typeof wishlistInput>;

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Would love',
  2: 'Nice to have',
  3: 'Someday',
};
