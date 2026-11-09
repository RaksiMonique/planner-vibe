import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SegmentDot } from '@/components/shared/segment-badge';
import type { SegmentRef } from '@/features/life-segments/types';
import type { MediaItemRow } from '../queries';
import { MEDIA_KIND_LABELS, STATUS_LABELS } from '../schema';
import { MediaItemFormDialog } from './media-forms';
import { RatingStars } from './rating-stars';

export function MediaTable({ items, segments }: { items: MediaItemRow[]; segments: SegmentRef[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead className="hidden sm:table-cell">Kind</TableHead>
          <TableHead className="hidden lg:table-cell">Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Rating</TableHead>
          <TableHead className="hidden md:table-cell">Finished</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {item.segment && <SegmentDot accent={item.segment.accent} />}
                <Link href={`/media/${item.id}`} className="min-w-0 truncate hover:underline">
                  {item.title}
                </Link>
                {item.isFavourite && <Badge variant="secondary">Favourite</Badge>}
              </div>
              {item.creator && <p className="text-muted-foreground text-xs">{item.creator}</p>}
            </TableCell>
            <TableCell className="hidden sm:table-cell">{MEDIA_KIND_LABELS[item.kind]}</TableCell>
            <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
              {item.category ?? ''}
            </TableCell>
            <TableCell>
              <Badge variant={item.status === 'in_progress' ? 'secondary' : 'outline'}>
                {STATUS_LABELS[item.status]}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <RatingStars rating={item.rating} />
            </TableCell>
            <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
              {item.finishedOn ? format(new Date(`${item.finishedOn}T00:00:00`), 'd MMM yyyy') : ''}
            </TableCell>
            <TableCell>
              <MediaItemFormDialog
                segments={segments}
                item={item}
                variant="ghost"
                size="xs"
                trigger="Edit"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
