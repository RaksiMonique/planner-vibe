import { z } from 'zod';

export const MEDIA_KINDS = ['book', 'movie', 'series', 'song', 'other'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
export const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  book: 'Book',
  movie: 'Film',
  series: 'Series',
  song: 'Song',
  other: 'Other',
};
/** Who made it, per kind, for labels. */
export const CREATOR_LABELS: Record<MediaKind, string> = {
  book: 'Author',
  movie: 'Director',
  series: 'Creator',
  song: 'Artist',
  other: 'Creator',
};

export const MEDIA_STATUSES = ['wishlist', 'in_progress', 'done', 'abandoned'] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];
export const STATUS_LABELS: Record<MediaStatus, string> = {
  wishlist: 'Want to',
  in_progress: 'In progress',
  done: 'Finished',
  abandoned: 'Abandoned',
};
/** Reading-list wording for books. */
export const BOOK_STATUS_LABELS: Record<MediaStatus, string> = {
  wishlist: 'Want to read',
  in_progress: 'Reading',
  done: 'Finished',
  abandoned: 'Abandoned',
};

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');
const optionalUuid = z.uuid().optional();
const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().min(min).max(max).optional()
  );

export const mediaItemInput = z
  .object({
    kind: z.enum(MEDIA_KINDS).default('book'),
    title: z.string().trim().min(1, 'Give it a title.').max(200),
    creator: z.string().trim().max(200).optional(),
    coverUrl: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .refine((v) => !v || /^https?:\/\//i.test(v), 'Use a full address starting with http.'),
    category: z.string().trim().max(80).optional(),
    status: z.enum(MEDIA_STATUSES).default('wishlist'),
    rating: optionalNumber(1, 5),
    review: z.string().trim().max(5000).optional(),
    notes: z.string().trim().max(5000).optional(),
    isFavourite: z.coerce.boolean().default(false),
    startedOn: dateKey.optional(),
    finishedOn: dateKey.optional(),
    lifeSegmentId: optionalUuid,
  })
  .refine((d) => !(d.startedOn && d.finishedOn && d.finishedOn < d.startedOn), {
    message: 'Finished before it started.',
    path: ['finishedOn'],
  });
export type MediaItemInput = z.infer<typeof mediaItemInput>;

export const mediaLogInput = z.object({
  mediaItemId: z.uuid(),
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  date: dateKey,
  progress: z.string().trim().max(80).optional(),
  minutes: optionalNumber(1, 1440),
  note: z.string().trim().max(2000).optional(),
});
export type MediaLogInput = z.infer<typeof mediaLogInput>;

export const mediaListInput = z.object({
  name: z.string().trim().min(1, 'Name the list.').max(80),
  kind: z.enum(MEDIA_KINDS).optional(),
});
export type MediaListInput = z.infer<typeof mediaListInput>;

export const listItemInput = z.object({ listId: z.uuid(), mediaItemId: z.uuid() });
