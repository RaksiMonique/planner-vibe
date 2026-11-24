import Link from 'next/link';
import { BookOpenIcon, PencilIcon, PinIcon, QuoteIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import type { SegmentRef } from '@/features/life-segments/types';
import { cn } from '@/lib/utils';
import { deleteNoteAction, keepNoteAction, toggleNotePinAction } from '../actions';
import type { NoteRow, SourceItemOption } from '../queries';
import { NoteFormDialog } from './note-form-dialog';

export function NoteCard({
  note,
  segments,
  sourceItems,
  tagSuggestions,
  /** Where a tag click filters; defaults to the page for the note's kind. */
  basePath = note.kind === 'quote' ? '/notes/quotes' : '/notes',
  /** In the review pile: offer "Keep" next to the usual actions. */
  reviewing = false,
}: {
  note: NoteRow;
  segments: SegmentRef[];
  sourceItems?: SourceItemOption[];
  tagSuggestions?: string[];
  basePath?: string;
  reviewing?: boolean;
}) {
  const quote = note.kind === 'quote';
  const attribution = [note.author, note.source].filter(Boolean).join(' · ');
  return (
    <Card
      className={cn(quote && 'bg-secondary ring-0', note.isPinned && !quote && 'ring-primary/40')}
    >
      <CardContent className="flex flex-col gap-3">
        {quote ? (
          <blockquote className="flex flex-col gap-2">
            <QuoteIcon className="text-primary size-4" aria-hidden />
            <p className="font-heading text-secondary-foreground text-lg leading-snug">
              {note.content}
            </p>
            {attribution && (
              <footer className="text-muted-foreground min-w-0 text-xs">
                {note.sourceItem ? (
                  <Link
                    href={`/media/${note.sourceItem.id}`}
                    className="link inline-flex max-w-full items-center gap-1"
                  >
                    <BookOpenIcon className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{attribution}</span>
                  </Link>
                ) : (
                  attribution
                )}
              </footer>
            )}
          </blockquote>
        ) : (
          <div className="flex flex-col gap-1">
            {note.title && <h3 className="font-heading text-lg leading-snug">{note.title}</h3>}
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            {note.sourceItem && (
              <Link
                href={`/media/${note.sourceItem.id}`}
                className="text-muted-foreground link inline-flex max-w-full items-center gap-1 text-xs"
              >
                <BookOpenIcon className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{note.sourceItem.title}</span>
              </Link>
            )}
          </div>
        )}
        {note.why && (
          <p className="text-muted-foreground border-primary/40 border-l-2 pl-2 text-sm">
            <span className="text-primary text-xs uppercase">Why </span>
            {note.why}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <SegmentBadge name={note.segment.name} accent={note.segment.accent} />
          {note.tags.map((tag) => (
            <Link
              key={tag}
              href={`${basePath}?tag=${encodeURIComponent(tag)}`}
              className="max-w-full"
            >
              <Badge variant="outline" className="hover:bg-muted max-w-full">
                <span className="truncate">{tag}</span>
              </Badge>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {reviewing && (
            <form action={keepNoteAction}>
              <input type="hidden" name="id" value={note.id} />
              <Button type="submit" variant="secondary" size="sm">
                Keep
              </Button>
            </form>
          )}
          <div className="ml-auto flex items-center gap-1">
            <form action={toggleNotePinAction}>
              <input type="hidden" name="id" value={note.id} />
              <input type="hidden" name="pinned" value={note.isPinned ? '0' : '1'} />
              <Button
                type="submit"
                variant={note.isPinned ? 'secondary' : 'ghost'}
                size="icon-sm"
                aria-label={
                  note.isPinned
                    ? quote
                      ? 'Remove from favourites'
                      : 'Unpin'
                    : quote
                      ? 'Favourite'
                      : 'Pin'
                }
                aria-pressed={note.isPinned}
              >
                <PinIcon />
              </Button>
            </form>
            <NoteFormDialog
              kind={note.kind}
              segments={segments}
              note={note}
              sourceItems={sourceItems}
              tagSuggestions={tagSuggestions}
              variant="ghost"
              size="icon-sm"
              trigger={
                <>
                  <PencilIcon />
                  <span className="sr-only">Edit</span>
                </>
              }
            />
            <ConfirmActionButton
              action={deleteNoteAction}
              fields={{ id: note.id }}
              title={quote ? 'Delete this quote?' : 'Delete this note?'}
              trigger={reviewing ? 'Let it go' : 'Delete'}
              variant="ghost"
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
