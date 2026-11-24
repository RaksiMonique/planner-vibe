import { z } from 'zod';

const optionalUuid = z.preprocess(
  (v) => (v === '' || v === 'none' ? undefined : v),
  z.uuid().optional()
);

export const breakIdeaInput = z.object({
  title: z.string().trim().min(1, 'Say what the break is.').max(80),
  isMovement: z.coerce.boolean().default(false),
  /** A habit the break also counts for; taking the break checks it in. */
  habitId: optionalUuid,
});
export type BreakIdeaInput = z.infer<typeof breakIdeaInput>;

/** What the picker and the list need to know about an idea. */
export type BreakIdeaView = {
  id: string;
  title: string;
  isMovement: boolean;
  habitId: string | null;
};

/** The first ideas a user gets, so the roll has something to land on. */
export const STARTER_BREAK_IDEAS: ReadonlyArray<{ title: string; isMovement: boolean }> = [
  { title: 'Write one paragraph in the journal', isMovement: false },
  { title: 'Five minutes of quiet', isMovement: false },
  { title: 'Stretch', isMovement: true },
  { title: 'Walk around the block', isMovement: true },
  { title: 'Call someone you like', isMovement: false },
  { title: 'Put one song on and listen to all of it', isMovement: false },
];

/**
 * Picks one idea at random. With `preferMovement`, movement ideas weigh twice
 * as much, since a break after seated work should get the body moving. The
 * previous pick is left out when there is anything else to choose from.
 */
export function pickBreakIdea<T extends { id: string; isMovement: boolean }>(
  ideas: readonly T[],
  opts: { preferMovement?: boolean; exclude?: string | null; random?: () => number } = {}
): T | null {
  const random = opts.random ?? Math.random;
  const pool = ideas.length > 1 ? ideas.filter((i) => i.id !== opts.exclude) : ideas;
  if (pool.length === 0) return null;
  const weight = (i: T) => (opts.preferMovement && i.isMovement ? 2 : 1);
  const total = pool.reduce((sum, i) => sum + weight(i), 0);
  let roll = random() * total;
  for (const idea of pool) {
    roll -= weight(idea);
    if (roll < 0) return idea;
  }
  return pool[pool.length - 1];
}
