import Link from 'next/link';
import { ImagesIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import type { BoardRow } from '../queries';

export function BoardCard({ board }: { board: BoardRow }) {
  return (
    <Link href={`/vision-boards/${board.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden py-0 transition-shadow group-hover:shadow-md">
        <div className="bg-blush relative aspect-[4/3] w-full overflow-hidden">
          {board.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={board.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              <ImagesIcon className="size-8" aria-hidden />
            </div>
          )}
        </div>
        <CardContent className="flex flex-col gap-1.5 py-3">
          <p className="font-heading truncate text-lg leading-snug">{board.name}</p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1">
              <SegmentDot accent={board.segment.accent} />
              {board.segment.name}
            </span>
            {board.category && <Badge variant="outline">{board.category}</Badge>}
            <span className="ml-auto">
              {board.itemCount} item{board.itemCount === 1 ? '' : 's'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
