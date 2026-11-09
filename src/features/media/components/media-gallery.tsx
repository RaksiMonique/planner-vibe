import Link from 'next/link';
import { HeartIcon } from 'lucide-react';
import type { MediaItemRow } from '../queries';
import { MEDIA_KIND_LABELS, STATUS_LABELS } from '../schema';
import { RatingStars } from './rating-stars';

/** Cover-first grid; covers are resolved by the page (signed URLs for uploads). */
export function MediaGallery({
  items,
  coverSrcs,
}: {
  items: MediaItemRow[];
  coverSrcs: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/media/${item.id}`}
          className="group bg-card flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
        >
          <div className="bg-blush text-muted-foreground relative flex aspect-[2/3] items-center justify-center overflow-hidden text-xs">
            {coverSrcs[item.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverSrcs[item.id]} alt="" className="h-full w-full object-cover" />
            ) : (
              MEDIA_KIND_LABELS[item.kind]
            )}
            {item.isFavourite && (
              <HeartIcon
                className="fill-terracotta text-terracotta absolute top-2 right-2 size-4"
                aria-label="Favourite"
              />
            )}
          </div>
          <div className="flex flex-col gap-1 px-2.5 py-2">
            <p className="font-heading truncate text-sm leading-snug">{item.title}</p>
            {item.creator && (
              <p className="text-muted-foreground truncate text-xs">{item.creator}</p>
            )}
            <div className="text-muted-foreground flex items-center justify-between text-[11px]">
              <span>{STATUS_LABELS[item.status]}</span>
              <RatingStars rating={item.rating} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
