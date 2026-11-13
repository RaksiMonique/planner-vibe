import type { Metadata } from 'next';
import { BookMarkedIcon, PlusIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentFilter } from '@/features/life-segments/components/segment-filter';
import { listSegments } from '@/features/life-segments/service';
import { MediaCard } from '@/features/media/components/media-card';
import { MediaItemFormDialog } from '@/features/media/components/media-forms';
import { MediaLists } from '@/features/media/components/media-lists';
import { resolveCoverSrcs } from '@/features/media/covers';
import { listMediaLists, listMediaRows } from '@/features/media/queries';
import { BOOK_STATUS_LABELS, MEDIA_STATUSES, type MediaStatus } from '@/features/media/schema';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';

export const metadata: Metadata = { title: 'Reading list' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const ORDER: MediaStatus[] = ['in_progress', 'wishlist', 'done', 'abandoned'];

export default async function ReadingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const segmentSlug = typeof params.segment === 'string' ? params.segment : undefined;
  const [segments, prefs] = await Promise.all([listSegments(user.id), getPreferences(user.id)]);
  const segment = segments.find((s) => s.slug === segmentSlug);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const [books, lists] = await Promise.all([
    listMediaRows(user.id, { kind: 'book', lifeSegmentId: segment?.id }),
    listMediaLists(user.id),
  ]);
  const bookLists = lists.filter((l) => !l.kind || l.kind === 'book');
  const coverSrcs = await resolveCoverSrcs(books);

  const addDialog = (
    <MediaItemFormDialog
      segments={segments}
      defaultKind="book"
      defaultSegmentId={segment?.id}
      trigger={
        <>
          <PlusIcon data-icon="inline-start" />
          Add book
        </>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Reading list"
        description="What you are reading, want to read and have finished. Filter by segment for the spiritual reading list."
        actions={addDialog}
      />
      <SegmentFilter basePath="/media/reading" segments={segments} current={segment?.slug} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-8">
          {books.length === 0 ? (
            <EmptyState
              icon={BookMarkedIcon}
              title="No books yet"
              description="Add the book on your nightstand and the ones you mean to get to."
              action={addDialog}
            />
          ) : (
            ORDER.filter((status) => MEDIA_STATUSES.includes(status)).map((status) => {
              const group = books.filter((b) => b.status === status);
              if (group.length === 0) return null;
              return (
                <section key={status} className="flex flex-col gap-3">
                  <h3 className="font-heading text-xl">
                    {BOOK_STATUS_LABELS[status]}{' '}
                    <span className="text-muted-foreground text-sm">{group.length}</span>
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.map((b) => (
                      <MediaCard
                        key={b.id}
                        item={b}
                        segments={segments}
                        lists={bookLists}
                        todayKey={todayKey}
                        coverSrc={coverSrcs[b.id] ?? null}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
        <aside className="flex flex-col gap-3">
          <h3 className="font-heading text-xl">Lists</h3>
          <MediaLists lists={bookLists} />
        </aside>
      </div>
    </>
  );
}
