import type { Metadata } from 'next';
import Link from 'next/link';
import { ClapperboardIcon, PlusIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { listSegments } from '@/features/life-segments/service';
import { resolveCoverSrcs } from '@/features/media/covers';
import { MediaFilters, type MediaQuery } from '@/features/media/components/media-filters';
import { MediaItemFormDialog } from '@/features/media/components/media-forms';
import { MediaGallery } from '@/features/media/components/media-gallery';
import { MediaListView } from '@/features/media/components/media-list-view';
import { MediaTable } from '@/features/media/components/media-table';
import { listMediaCategories, listMediaRows } from '@/features/media/queries';
import {
  MEDIA_KINDS,
  MEDIA_STATUSES,
  MEDIA_VIEWS,
  type MediaKind,
  type MediaStatus,
  type MediaView,
} from '@/features/media/schema';
import { requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Media' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

export default async function MediaPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const kind = str(params.kind);
  const status = str(params.status);
  const view = str(params.view);
  const query: MediaQuery = {
    kind: MEDIA_KINDS.includes(kind as MediaKind) ? (kind as MediaKind) : undefined,
    status: MEDIA_STATUSES.includes(status as MediaStatus) ? (status as MediaStatus) : undefined,
    favourite: params.fav === '1',
    category: str(params.category),
    q: str(params.q)?.slice(0, 80),
    view: MEDIA_VIEWS.includes(view as MediaView) ? (view as MediaView) : 'gallery',
  };
  const [segments, items, categories] = await Promise.all([
    listSegments(user.id),
    listMediaRows(user.id, {
      kind: query.kind,
      status: query.status,
      favourite: query.favourite,
      category: query.category,
      q: query.q,
    }),
    listMediaCategories(user.id),
  ]);
  const coverSrcs = query.view === 'gallery' ? await resolveCoverSrcs(items) : {};
  const filtered = !!(query.kind || query.status || query.favourite || query.category || query.q);

  return (
    <>
      <PageHeader
        title="Media"
        description="Books, films, series and songs: what you want to get to, what you are in the middle of, and what you thought of it."
        actions={
          <>
            <Link
              href="/media/reading"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Reading list
            </Link>
            <MediaItemFormDialog
              segments={segments}
              defaultKind={query.kind ?? 'book'}
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  Add item
                </>
              }
            />
          </>
        }
      />
      <MediaFilters query={query} categories={categories} />
      {items.length === 0 ? (
        <EmptyState
          icon={ClapperboardIcon}
          title={filtered ? 'Nothing matches' : 'Nothing in the library yet'}
          description={
            filtered
              ? 'Try another filter or clear the search.'
              : 'Add a book, film, series or song to start tracking.'
          }
        />
      ) : query.view === 'gallery' ? (
        <MediaGallery items={items} coverSrcs={coverSrcs} />
      ) : query.view === 'list' ? (
        <MediaListView items={items} />
      ) : (
        <Card>
          <CardContent className="px-0">
            <MediaTable items={items} segments={segments} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
