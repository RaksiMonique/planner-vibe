import type { Accent } from '@/lib/accents';

/** The slice of a Life Segment every other feature shows next to its rows. */
export type SegmentRef = { id: string; name: string; slug: string; accent: Accent };
