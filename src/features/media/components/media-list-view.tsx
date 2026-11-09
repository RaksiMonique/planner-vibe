import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { SegmentDot } from '@/components/shared/segment-badge';
import type { MediaItemRow } from '../queries';
import { MEDIA_KIND_LABELS, STATUS_LABELS } from '../schema';
import { RatingStars } from './rating-stars';

/** Compact rows for scanning quickly on a phone. */
export function MediaListView({ items }: { items: MediaItemRow[] }) {
  return (
    <ul className="bg-card divide-y rounded-xl border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-3 py-2">
          <span className="text-muted-foreground w-12 shrink-0 text-[11px] uppercase">
            {MEDIA_KIND_LABELS[item.kind]}
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/media/${item.id}`} className="block truncate text-sm hover:underline">
              {item.title}
            </Link>
            <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
              {item.creator && <span>{item.creator}</span>}
              {item.segment && (
                <span className="inline-flex items-center gap-1">
                  <SegmentDot accent={item.segment.accent} /> {item.segment.name}
                </span>
              )}
              {item.finishedOn && (
                <span>{format(new Date(`${item.finishedOn}T00:00:00`), 'd MMM yyyy')}</span>
              )}
            </p>
          </div>
          <RatingStars rating={item.rating} className="hidden sm:inline-flex" />
          <Badge variant={item.status === 'in_progress' ? 'secondary' : 'outline'}>
            {STATUS_LABELS[item.status]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
