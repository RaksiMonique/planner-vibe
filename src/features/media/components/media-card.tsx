import { format } from 'date-fns';
import { HeartIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import type { SegmentRef } from '@/features/life-segments/types';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { cn } from '@/lib/utils';
import {
  addToListAction,
  deleteMediaItemAction,
  setMediaStatusAction,
  toggleFavouriteAction,
} from '../actions';
import type { MediaItemRow, MediaListRow } from '../queries';
import { BOOK_STATUS_LABELS, MEDIA_KIND_LABELS, MEDIA_STATUSES, STATUS_LABELS } from '../schema';
import { MediaItemFormDialog, MediaLogDialog } from './media-forms';
import { RatingStars } from './rating-stars';

export function MediaCard({
  item,
  segments,
  lists,
  todayKey,
}: {
  item: MediaItemRow;
  segments: SegmentRef[];
  lists: MediaListRow[];
  todayKey: string;
}) {
  const labels = item.kind === 'book' ? BOOK_STATUS_LABELS : STATUS_LABELS;
  const candidateLists = lists.filter((l) => !l.items.some((i) => i.id === item.id));
  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex h-full gap-3">
        <div className="bg-blush text-muted-foreground flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md text-[10px]">
          {item.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            MEDIA_KIND_LABELS[item.kind]
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-heading truncate text-base leading-snug">{item.title}</p>
              {item.creator && (
                <p className="text-muted-foreground truncate text-xs">{item.creator}</p>
              )}
            </div>
            <form action={toggleFavouriteAction}>
              <input type="hidden" name="id" value={item.id} />
              <Button
                type="submit"
                size="icon-xs"
                variant="ghost"
                aria-label={item.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                aria-pressed={item.isFavourite}
              >
                <HeartIcon className={cn(item.isFavourite && 'fill-terracotta text-terracotta')} />
              </Button>
            </form>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <RatingStars rating={item.rating} />
            {item.category && <Badge variant="outline">{item.category}</Badge>}
            {item.segment && (
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <SegmentDot accent={item.segment.accent} />
                {item.segment.name}
              </span>
            )}
            {item.finishedOn && (
              <span className="text-muted-foreground">
                Finished {format(new Date(`${item.finishedOn}T00:00:00`), 'd MMM yyyy')}
              </span>
            )}
            {item.logCount > 0 && (
              <span className="text-muted-foreground">{item.logCount} logs</span>
            )}
          </div>
          {item.review && (
            <p className="text-muted-foreground line-clamp-2 text-xs">{item.review}</p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            <form action={setMediaStatusAction} className="contents">
              <input type="hidden" name="id" value={item.id} />
              <NativeSelect
                name="status"
                defaultValue={item.status}
                aria-label={`Status of ${item.title}`}
                className="h-7 w-auto text-xs"
              >
                {MEDIA_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {labels[s]}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" size="xs" variant="ghost">
                Set
              </Button>
            </form>
            <MediaLogDialog item={item} segments={segments} todayKey={todayKey} trigger="Log" />
            {candidateLists.length > 0 && (
              <form action={addToListAction} className="contents">
                <input type="hidden" name="mediaItemId" value={item.id} />
                <NativeSelect
                  name="listId"
                  aria-label={`Add ${item.title} to a list`}
                  className="h-7 w-auto text-xs"
                >
                  {candidateLists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </NativeSelect>
                <Button type="submit" size="xs" variant="ghost">
                  Add to list
                </Button>
              </form>
            )}
            <span className="ml-auto flex items-center">
              <MediaItemFormDialog
                segments={segments}
                item={item}
                variant="ghost"
                size="icon-xs"
                trigger={
                  <>
                    <PencilIcon />
                    <span className="sr-only">Edit {item.title}</span>
                  </>
                }
              />
              <ConfirmActionButton
                action={deleteMediaItemAction}
                fields={{ id: item.id }}
                title={`Delete "${item.title}"?`}
                description="Its logs go with it."
                variant="ghost"
                size="icon-xs"
                trigger={
                  <>
                    <Trash2Icon />
                    <span className="sr-only">Delete {item.title}</span>
                  </>
                }
              />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
