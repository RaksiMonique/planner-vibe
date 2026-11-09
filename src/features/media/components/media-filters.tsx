import Link from 'next/link';
import { HeartIcon, LayoutGridIcon, ListIcon, SearchIcon, TableIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { cn } from '@/lib/utils';
import {
  MEDIA_KIND_LABELS,
  MEDIA_KINDS,
  MEDIA_STATUSES,
  MEDIA_VIEWS,
  STATUS_LABELS,
  type MediaKind,
  type MediaStatus,
  type MediaView,
} from '../schema';

export type MediaQuery = {
  kind?: MediaKind;
  status?: MediaStatus;
  favourite?: boolean;
  category?: string;
  q?: string;
  view: MediaView;
};

export function mediaHref(query: Partial<MediaQuery>): string {
  const p = new URLSearchParams();
  if (query.kind) p.set('kind', query.kind);
  if (query.status) p.set('status', query.status);
  if (query.favourite) p.set('fav', '1');
  if (query.category) p.set('category', query.category);
  if (query.q) p.set('q', query.q);
  if (query.view && query.view !== 'gallery') p.set('view', query.view);
  const qs = p.toString();
  return qs ? `/media?${qs}` : '/media';
}

const VIEW_ICONS = { gallery: LayoutGridIcon, table: TableIcon, list: ListIcon } as const;

/** Chips, a search box and the view switch for /media. Everything is a link or a GET form. */
export function MediaFilters({ query, categories }: { query: MediaQuery; categories: string[] }) {
  const chip = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
      active ? 'border-primary bg-secondary text-secondary-foreground' : 'bg-card hover:bg-muted'
    );
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Link href={mediaHref({ ...query, kind: undefined })} className={chip(!query.kind)}>
          All kinds
        </Link>
        {MEDIA_KINDS.map((k) => (
          <Link key={k} href={mediaHref({ ...query, kind: k })} className={chip(query.kind === k)}>
            {MEDIA_KIND_LABELS[k]}
          </Link>
        ))}
        <span className="bg-border mx-1 hidden h-4 w-px sm:inline-block" />
        {MEDIA_STATUSES.map((s) => (
          <Link
            key={s}
            href={mediaHref({ ...query, status: query.status === s ? undefined : s })}
            className={chip(query.status === s)}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
        <Link
          href={mediaHref({ ...query, favourite: !query.favourite })}
          className={chip(!!query.favourite)}
          aria-pressed={!!query.favourite}
        >
          <HeartIcon className="size-3" aria-hidden /> Favourites
        </Link>
      </div>
      <form method="get" action="/media" className="flex flex-wrap items-center gap-2">
        {query.kind && <input type="hidden" name="kind" value={query.kind} />}
        {query.status && <input type="hidden" name="status" value={query.status} />}
        {query.favourite && <input type="hidden" name="fav" value="1" />}
        {query.view !== 'gallery' && <input type="hidden" name="view" value={query.view} />}
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={query.q ?? ''}
            placeholder="Search titles and creators"
            aria-label="Search"
            className="pl-8"
          />
        </div>
        {categories.length > 0 && (
          <NativeSelect
            name="category"
            defaultValue={query.category ?? ''}
            aria-label="Category"
            className="w-auto"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        )}
        <button type="submit" className="sr-only">
          Apply
        </button>
        <nav aria-label="View" className="bg-card ml-auto flex rounded-lg border p-0.5">
          {MEDIA_VIEWS.map((v) => {
            const Icon = VIEW_ICONS[v];
            return (
              <Link
                key={v}
                href={mediaHref({ ...query, view: v })}
                aria-current={query.view === v ? 'page' : undefined}
                aria-label={`${v} view`}
                className={cn(
                  'rounded-md p-1.5',
                  query.view === v
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-4" aria-hidden />
              </Link>
            );
          })}
        </nav>
      </form>
    </div>
  );
}
