import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeftIcon, HeartIcon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { listSegments } from '@/features/life-segments/service';
import { NativeSelect } from '@/features/tasks/components/native-select';
import {
  addToListAction,
  clearCoverAction,
  deleteMediaItemAndLeaveAction,
  deleteMediaLogAction,
  removeFromListAction,
  setMediaStatusAction,
  toggleFavouriteAction,
} from '@/features/media/actions';
import { CoverUploadForm } from '@/features/media/components/cover-upload-form';
import { MediaItemFormDialog, MediaLogDialog } from '@/features/media/components/media-forms';
import { RatingStars } from '@/features/media/components/rating-stars';
import { resolveCoverSrcs } from '@/features/media/covers';
import { getMediaItemRow, listMediaLists, listMediaLogs } from '@/features/media/queries';
import {
  BOOK_STATUS_LABELS,
  CREATOR_LABELS,
  MEDIA_KIND_LABELS,
  MEDIA_STATUSES,
  STATUS_LABELS,
} from '@/features/media/schema';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Media item' };
export const dynamic = 'force-dynamic';

const day = (key: string) => format(new Date(`${key}T00:00:00`), 'd MMM yyyy');

export default async function MediaItemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const item = await getMediaItemRow(user.id, id);
  if (!item) notFound();
  const [segments, prefs, logs, lists, covers] = await Promise.all([
    listSegments(user.id),
    getPreferences(user.id),
    listMediaLogs(user.id, id),
    listMediaLists(user.id),
    resolveCoverSrcs([item]),
  ]);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const labels = item.kind === 'book' ? BOOK_STATUS_LABELS : STATUS_LABELS;
  const memberOf = lists.filter((l) => l.items.some((i) => i.id === item.id));
  const candidates = lists.filter(
    (l) => !memberOf.includes(l) && (!l.kind || l.kind === item.kind)
  );
  const cover = covers[item.id];

  return (
    <>
      <Link
        href={item.kind === 'book' ? '/media/reading' : '/media'}
        className="text-muted-foreground mb-3 inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />{' '}
        {item.kind === 'book' ? 'Reading list' : 'Media'}
      </Link>
      <PageHeader
        eyebrow={MEDIA_KIND_LABELS[item.kind]}
        title={item.title}
        description={item.creator ? `${CREATOR_LABELS[item.kind]}: ${item.creator}` : undefined}
        actions={
          <>
            <form action={toggleFavouriteAction}>
              <input type="hidden" name="id" value={item.id} />
              <Button type="submit" variant="outline" size="sm" aria-pressed={item.isFavourite}>
                <HeartIcon
                  data-icon="inline-start"
                  className={cn(item.isFavourite && 'fill-terracotta text-terracotta')}
                />
                {item.isFavourite ? 'Favourite' : 'Add to favourites'}
              </Button>
            </form>
            <MediaItemFormDialog
              segments={segments}
              item={item}
              variant="outline"
              trigger={
                <>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </>
              }
            />
            <ConfirmActionButton
              action={deleteMediaItemAndLeaveAction}
              fields={{ id: item.id }}
              title={`Delete "${item.title}"?`}
              description="Its logs go with it."
              variant="outline"
              trigger={
                <>
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </>
              }
            />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="flex flex-col gap-3">
          <div className="bg-blush text-muted-foreground flex aspect-[2/3] items-center justify-center overflow-hidden rounded-xl text-sm">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              'No cover'
            )}
          </div>
          <CoverUploadForm itemId={item.id} />
          {item.coverUrl && (
            <form action={clearCoverAction}>
              <input type="hidden" name="id" value={item.id} />
              <Button type="submit" size="xs" variant="ghost">
                Remove cover
              </Button>
            </form>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.status === 'in_progress' ? 'secondary' : 'outline'}>
                  {labels[item.status]}
                </Badge>
                <RatingStars rating={item.rating} />
                {item.category && <Badge variant="outline">{item.category}</Badge>}
                {item.segment && (
                  <SegmentBadge name={item.segment.name} accent={item.segment.accent} />
                )}
                <form action={setMediaStatusAction} className="ml-auto flex items-center gap-1">
                  <input type="hidden" name="id" value={item.id} />
                  <NativeSelect
                    name="status"
                    defaultValue={item.status}
                    aria-label="Status"
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
              </div>
              <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <dt>Started</dt>
                <dd className="text-foreground">{item.startedOn ? day(item.startedOn) : '—'}</dd>
                <dt>Finished</dt>
                <dd className="text-foreground">{item.finishedOn ? day(item.finishedOn) : '—'}</dd>
              </dl>
              {item.review && (
                <div>
                  <p className="text-muted-foreground text-xs">Review</p>
                  <p className="whitespace-pre-line">{item.review}</p>
                </div>
              )}
              {item.notes && (
                <div>
                  <p className="text-muted-foreground text-xs">Notes</p>
                  <p className="whitespace-pre-line">{item.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl">Progress log</h2>
              <span className="text-muted-foreground text-xs">{logs.length}</span>
              <span className="ml-auto">
                <MediaLogDialog
                  item={item}
                  segments={segments}
                  todayKey={todayKey}
                  trigger="Log progress"
                  size="sm"
                />
              </span>
            </div>
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No entries yet. Log a page, a chapter, an episode or a listen.
              </p>
            ) : (
              <ul className="bg-card divide-y rounded-xl border">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="text-muted-foreground w-24 shrink-0 text-xs">
                      {day(log.date)}
                    </span>
                    <span className="min-w-0 flex-1">
                      {log.progress && <span>{log.progress}</span>}
                      {log.minutes && (
                        <span className="text-muted-foreground"> · {log.minutes} min</span>
                      )}
                      {log.note && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {log.note}
                        </span>
                      )}
                    </span>
                    <form action={deleteMediaLogAction}>
                      <input type="hidden" name="id" value={log.id} />
                      <Button
                        type="submit"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Delete log entry"
                      >
                        <XIcon />
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading text-xl">Lists</h2>
            {memberOf.length === 0 && candidates.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No lists yet. Create one on the{' '}
                <Link href="/media/reading" className="text-primary hover:underline">
                  reading list
                </Link>{' '}
                page.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {memberOf.map((l) => (
                  <form key={l.id} action={removeFromListAction} className="contents">
                    <input type="hidden" name="listId" value={l.id} />
                    <input type="hidden" name="mediaItemId" value={item.id} />
                    <Badge variant="secondary">
                      {l.name}
                      <button type="submit" className="ml-1" aria-label={`Remove from ${l.name}`}>
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  </form>
                ))}
                {candidates.length > 0 && (
                  <form action={addToListAction} className="flex items-center gap-1">
                    <input type="hidden" name="mediaItemId" value={item.id} />
                    <NativeSelect
                      name="listId"
                      aria-label="Add to a list"
                      className="h-7 w-auto text-xs"
                    >
                      {candidates.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button type="submit" size="xs" variant="outline">
                      Add to list
                    </Button>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
