import 'server-only';
import { lifeSegments } from '@/db/schema';

/** Column selection for a SegmentRef inside a join. */
export const segmentRefColumns = {
  id: lifeSegments.id,
  name: lifeSegments.name,
  slug: lifeSegments.slug,
  accent: lifeSegments.accent,
};
