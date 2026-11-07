import { z } from 'zod';

export const JOURNAL_KINDS = ['daily', 'gratitude', 'wellness', 'reflection'] as const;
export type JournalKind = (typeof JOURNAL_KINDS)[number];

export const dateKeyValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date.');

export const journalEntryInput = z.object({
  lifeSegmentId: z.uuid('Choose a Life Segment.'),
  kind: z.enum(JOURNAL_KINDS).default('daily'),
  date: dateKeyValue,
  title: z.string().trim().max(160).optional(),
  content: z.string().trim().min(1, 'Write something first.').max(20_000),
  mood: z.coerce.number().int().min(1).max(5).optional(),
});
export type JournalEntryInput = z.infer<typeof journalEntryInput>;

export const gratitudeInput = z.object({
  lifeSegmentId: z.uuid().optional(),
  date: dateKeyValue,
  lines: z.array(z.string().trim().max(500)).default([]),
});

export const quickGratitudeInput = z.object({
  date: dateKeyValue,
  content: z.string().trim().min(1, 'Write one thing you are grateful for.').max(500),
});

export const MOOD_LABELS: Record<number, string> = {
  1: 'Rough',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};

/** Gratitude is stored as one entry per day, one line per thing. */
export function gratitudeLines(content: string | null | undefined): string[] {
  return (content ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export function excerpt(content: string, max = 160): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
