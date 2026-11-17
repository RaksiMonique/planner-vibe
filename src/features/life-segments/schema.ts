import { z } from 'zod';

export const ACCENTS = ['plum', 'crimson', 'raspberry', 'gold', 'rose', 'blush'] as const;

export const segmentInput = z.object({
  name: z.string().trim().min(1, 'Give the segment a name.').max(60),
  accent: z.enum(ACCENTS).default('plum'),
  icon: z.string().trim().max(40).optional(),
  weight: z.coerce.number().int().min(1).max(5).default(1),
});
export type SegmentInput = z.infer<typeof segmentInput>;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export const ACCENT_LABELS: Record<(typeof ACCENTS)[number], string> = {
  plum: 'Plum',
  crimson: 'Crimson',
  raspberry: 'Raspberry',
  gold: 'Gold',
  rose: 'Rose',
  blush: 'Blush',
};
