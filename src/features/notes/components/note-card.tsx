import { PencilIcon, PinIcon, QuoteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentBadge } from '@/components/shared/segment-badge';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import type { SegmentRef } from '@/features/life-segments/types';
import { cn } from '@/lib/utils';
import { deleteNoteAction, toggleNotePinAction } from '../actions';
import type { NoteRow } from '../queries';
import { NoteFormDialog } from './note-form-dialog';

export function NoteCard({ note, segments }: { note: NoteRow; segments: SegmentRef[] }) {
  const quote = note.kind === 'quote';
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
            {(note.author || note.source) && (
              <footer className="text-muted-foreground text-xs">
                {note.author}
                {note.author && note.source ? ' · ' : ''}
                {note.source}
              </footer>
            )}
          </blockquote>
        ) : (
          <div className="flex flex-col gap-1">
            {note.title && <h3 className="font-heading text-lg leading-snug">{note.title}</h3>}
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <SegmentBadge name={note.segment.name} accent={note.segment.accent} />
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
              trigger="Delete"
              variant="ghost"
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
