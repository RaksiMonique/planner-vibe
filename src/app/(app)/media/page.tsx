import type { Metadata } from 'next';
import Link from 'next/link';
import { ClapperboardIcon, PlusIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { listSegments } from '@/features/life-segments/service';
import { MediaItemFormDialog } from '@/features/media/components/media-forms';
import { MediaTable } from '@/features/media/components/media-table';
import { listMediaRows } from '@/features/media/queries';
import { MEDIA_KIND_LABELS, MEDIA_KINDS, type MediaKind } from '@/features/media/schema';
import { requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Media' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;

export default async function MediaPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const kindParam = typeof params.kind === 'string' ? params.kind : undefined;
  const kind = MEDIA_KINDS.includes(kindParam as MediaKind) ? (kindParam as MediaKind) : undefined;
  const [segments, items] = await Promise.all([
    listSegments(user.id),
    listMediaRows(user.id, { kind }),
  ]);
  const chip = (active: boolean) =>
    cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors',
      active ? 'border-primary bg-secondary text-secondary-foreground' : 'bg-card hover:bg-muted'
    );

  return (
    <>
      <PageHeader
        eyebrow="Lifestyle"
        title="Media"
        description="Books, films, series and songs in one library. The full tracker with galleries arrives in Release 4."
        actions={
          <MediaItemFormDialog
            segments={segments}
            defaultKind={kind ?? 'book'}
            trigger={
              <>
                <PlusIcon data-icon="inline-start" />
                Add item
              </>
            }
          />
        }
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/media" className={chip(!kind)}>
          All kinds
        </Link>
        {MEDIA_KINDS.map((k) => (
          <Link key={k} href={`/media?kind=${k}`} className={chip(kind === k)}>
            {MEDIA_KIND_LABELS[k]}
          </Link>
        ))}
        <Link href="/media/reading" className={cn(chip(false), 'ml-auto')}>
          Reading list
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={ClapperboardIcon}
          title="Nothing in the library yet"
          description="Add a book, film, series or song to start tracking."
        />
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
