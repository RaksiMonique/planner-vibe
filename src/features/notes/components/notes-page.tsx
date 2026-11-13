import { FileTextIcon, PlusIcon, QuoteIcon, SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SubmitButton } from '@/components/shared/submit-button';
import { SegmentFilter } from '@/features/life-segments/components/segment-filter';
import { listSegments } from '@/features/life-segments/service';
import { searchNotes } from '../queries';
import type { NoteKind } from '../schema';
import { NoteCard } from './note-card';
import { NoteFormDialog } from './note-form-dialog';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

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
  const segments = await listSegments(userId);
  const segment = segments.find((s) => s.slug === segmentSlug);
  const rows = await searchNotes(userId, { kind, q, lifeSegmentId: segment?.id });
  const base = kind === 'quote' ? '/notes/quotes' : '/notes';
  const noun = kind === 'quote' ? 'quote' : 'note';
  const defaultSegmentId = segment?.id ?? segments.find((s) => s.slug === 'growth')?.id;

  return (
    <>
      <PageHeader
        title={kind === 'quote' ? 'Quotes' : 'Notes'}
        description={
          kind === 'quote'
            ? 'Words worth keeping. Favourites feed the inspiration card on the dashboard.'
            : 'Anything worth keeping that is not a task. Pinned notes stay on top.'
        }
        actions={
          <NoteFormDialog
            kind={kind}
            segments={segments}
            defaultSegmentId={defaultSegmentId}
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
          <Input
            name="q"
            defaultValue={q ?? ''}
            placeholder={`Search ${noun}s…`}
            aria-label="Search"
          />
          <SubmitButton size="sm" variant="outline" pendingLabel="Searching…">
            <SearchIcon data-icon="inline-start" />
            Search
          </SubmitButton>
        </form>
        <SegmentFilter
          segments={segments}
          current={segment?.slug}
          basePath={base}
          extra={q ? { q } : {}}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={kind === 'quote' ? QuoteIcon : FileTextIcon}
          title={q ? `Nothing matches “${q}”` : kind === 'quote' ? 'No quotes yet' : 'No notes yet'}
          description={
            q
              ? 'Try a different word.'
              : kind === 'quote'
                ? 'Add the lines that keep you going.'
                : 'Keep the things that are not tasks here.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((n) => (
            <NoteCard key={n.id} note={n} segments={segments} />
          ))}
        </div>
      )}
    </>
  );
}
