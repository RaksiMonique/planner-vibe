import Link from 'next/link';
import { FileTextIcon, PlusIcon, QuoteIcon, SearchIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SubmitButton } from '@/components/shared/submit-button';
import { SegmentFilter } from '@/features/life-segments/components/segment-filter';
import { listSegments } from '@/features/life-segments/service';
import { cn } from '@/lib/utils';
import {
  countStaleNotes,
  listSourceItemOptions,
  listTags,
  searchNotes,
  STALE_AFTER_DAYS,
} from '../queries';
import type { NoteKind } from '../schema';
import { NoteCard } from './note-card';
import { NoteFormDialog } from './note-form-dialog';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);
const TOP_TAGS = 12;

/** Shared page for `/notes` and `/notes/quotes`. */
export async function NotesPage({
  kind,
  userId,
  searchParams,
}: {
  kind: NoteKind;
  userId: string;
  searchParams: Search;
}) {
  const q = str(searchParams.q)?.trim() || undefined;
  const segmentSlug = str(searchParams.segment);
  const tag = str(searchParams.tag)?.trim().toLowerCase() || undefined;
  const stale = searchParams.stale === '1';
  const segments = await listSegments(userId);
  const segment = segments.find((s) => s.slug === segmentSlug);
  const [rows, tags, sourceItems, staleCount] = await Promise.all([
    searchNotes(userId, { kind, q, lifeSegmentId: segment?.id, tag, stale }),
    listTags(userId, kind),
    listSourceItemOptions(userId),
    countStaleNotes(userId, kind),
  ]);
  const base = kind === 'quote' ? '/notes/quotes' : '/notes';
  const noun = kind === 'quote' ? 'quote' : 'note';
  const defaultSegmentId = segment?.id ?? segments.find((s) => s.slug === 'growth')?.id;
  const tagSuggestions = tags.map((t) => t.tag);
  const extra = { ...(q ? { q } : {}), ...(tag ? { tag } : {}), ...(stale ? { stale: '1' } : {}) };
  const hrefWith = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const all = { segment: segment?.slug, q, tag, stale: stale ? '1' : undefined, ...changes };
    for (const [k, v] of Object.entries(all)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <>
      <PageHeader
        title={kind === 'quote' ? 'Quotes' : 'Notes'}
        description={
          kind === 'quote'
            ? 'Words worth keeping, with why they matter to you. Favourites feed the dashboard.'
            : 'Anything worth keeping that is not a task, with why it matters. Pinned notes stay on top.'
        }
        actions={
          <NoteFormDialog
            kind={kind}
            segments={segments}
            defaultSegmentId={defaultSegmentId}
            sourceItems={sourceItems}
            tagSuggestions={tagSuggestions}
            trigger={
              <>
                <PlusIcon data-icon="inline-start" />
                New {noun}
              </>
            }
          />
        }
      />
      <div className="mb-4 flex flex-col gap-3">
        <form action={base} className="flex max-w-md gap-2">
          {segment && <input type="hidden" name="segment" value={segment.slug} />}
          {tag && <input type="hidden" name="tag" value={tag} />}
          <Input
            name="q"
            defaultValue={q ?? ''}
            placeholder={`Search ${noun}s, tags and whys…`}
            aria-label="Search"
          />
          <SubmitButton size="sm" variant="outline" pendingLabel="Searching…">
            <SearchIcon data-icon="inline-start" />
            Search
          </SubmitButton>
        </form>
        <SegmentFilter segments={segments} current={segment?.slug} basePath={base} extra={extra} />
        {(tags.length > 0 || tag) && (
          <nav aria-label="Tags" className="flex flex-wrap items-center gap-1.5">
            {tag && (
              <Link href={hrefWith({ tag: undefined })} className="max-w-full">
                <Badge variant="secondary" className="max-w-full gap-1">
                  <span className="truncate">{tag}</span>
                  <XIcon className="size-3 shrink-0" aria-label="Clear tag" />
                </Badge>
              </Link>
            )}
            {tags
              .filter((t) => t.tag !== tag)
              .slice(0, TOP_TAGS)
              .map((t) => (
                <Link key={t.tag} href={hrefWith({ tag: t.tag })} className="max-w-full">
                  <Badge variant="outline" className="hover:bg-muted max-w-full gap-1">
                    <span className="truncate">{t.tag}</span>
                    <span className="text-muted-foreground tabular-nums">{t.count}</span>
                  </Badge>
                </Link>
              ))}
          </nav>
        )}
        {staleCount > 0 && !stale && (
          <p className="text-muted-foreground text-sm" data-slot="stale-nudge">
            {staleCount} {staleCount === 1 ? noun : `${noun}s`} untouched for three months.{' '}
            <Link href={hrefWith({ stale: '1', q: undefined })} className="text-primary link">
              Still useful?
            </Link>
          </p>
        )}
        {stale && (
          <div
            className={cn(
              'bg-secondary flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm'
            )}
            data-slot="stale-review"
          >
            <span className="min-w-0 flex-1">
              {kind === 'quote' ? 'Quotes' : 'Notes'} not pinned or edited in {STALE_AFTER_DAYS}{' '}
              days, oldest first. Keep what still speaks to you and let the rest go.
            </span>
            <Link href={hrefWith({ stale: undefined })} className="text-primary link text-xs">
              Back to all
            </Link>
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={kind === 'quote' ? QuoteIcon : FileTextIcon}
          title={
            stale
              ? 'Nothing waiting for review'
              : q
                ? `Nothing matches “${q}”`
                : tag
                  ? `Nothing tagged “${tag}”`
                  : kind === 'quote'
                    ? 'No quotes yet'
                    : 'No notes yet'
          }
          description={
            stale
              ? 'Everything here has been touched lately.'
              : q || tag
                ? 'Try a different word.'
                : kind === 'quote'
                  ? 'Add the lines that keep you going, and say why.'
                  : 'Keep the things that are not tasks here.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              segments={segments}
              sourceItems={sourceItems}
              tagSuggestions={tagSuggestions}
              basePath={base}
              reviewing={stale}
            />
          ))}
        </div>
      )}
    </>
  );
}
