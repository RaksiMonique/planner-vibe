'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { differenceInCalendarDays, formatDistanceToNowStrict } from 'date-fns';
import { CalendarPlusIcon, QuoteIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/shared/submit-button';
import type { LifeSegment } from '@/features/life-segments/service';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { convertCaptureAction, removeCaptureAction } from '../actions';
import type { Capture } from '../queries';

/** Captures older than this are offered for letting go rather than filing. */
export const LINGERING_AFTER_DAYS = 30;

export function Inbox({ captures, segments }: { captures: Capture[]; segments: LifeSegment[] }) {
  if (captures.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Inbox zero. Captured thoughts land here until they get a Life Segment.
      </p>
    );
  }
  const now = new Date();
  const lingering = captures.filter(
    (c) => differenceInCalendarDays(now, new Date(c.createdAt)) >= LINGERING_AFTER_DAYS
  );
  const fresh = captures.filter((c) => !lingering.includes(c));
  return (
    <div className="flex flex-col gap-2">
      {fresh.length > 0 && (
        <ul className="flex flex-col gap-2">
          {fresh.map((c) => (
            <InboxItem key={c.id} capture={c} segments={segments} />
          ))}
        </ul>
      )}
      {lingering.length > 0 && (
        <details className="group" data-slot="lingering-captures">
          <summary className="text-muted-foreground cursor-pointer text-xs select-none">
            {lingering.length} here for over a month. Still useful?
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {lingering.map((c) => (
              <InboxItem key={c.id} capture={c} segments={segments} lingering />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

type Mode = 'closed' | 'file' | 'quote';

function InboxItem({
  capture,
  segments,
  lingering = false,
}: {
  capture: Capture;
  segments: LifeSegment[];
  lingering?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('closed');
  const [state, action] = useActionState(convertCaptureAction, undefined);
  const [removing, startRemove] = useTransition();
  const quote = mode === 'quote';

  return (
    <li className="bg-card flex flex-col gap-2 rounded-lg border px-2.5 py-2">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm">{capture.text}</p>
        {/* Relative to now, so the server and the hydrating client can disagree. */}
        <time
          dateTime={new Date(capture.createdAt).toISOString()}
          suppressHydrationWarning
          className="text-muted-foreground text-xs whitespace-nowrap"
        >
          {formatDistanceToNowStrict(capture.createdAt, { addSuffix: true })}
        </time>
      </div>
      {mode !== 'closed' ? (
        <form action={action} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={capture.id} />
          {quote && <input type="hidden" name="as" value="quote" />}
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              name="lifeSegmentId"
              aria-label="Life Segment"
              className="w-auto max-w-full flex-1"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Choose a segment…
              </option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
            {!quote && (
              <>
                <SubmitButton size="sm" name="as" value="task" pendingLabel="Filing…">
                  File as task
                </SubmitButton>
                <SubmitButton
                  size="sm"
                  variant="outline"
                  name="as"
                  value="note"
                  pendingLabel="Filing…"
                >
                  File as note
                </SubmitButton>
                <Button type="button" size="sm" variant="outline" onClick={() => setMode('quote')}>
                  <QuoteIcon data-icon="inline-start" />
                  As quote
                </Button>
              </>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={() => setMode('closed')}>
              Cancel
            </Button>
          </div>
          {quote && (
            <div className="flex flex-col gap-2" data-slot="quote-fields">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  name="author"
                  placeholder="Who said it"
                  aria-label="Author"
                  maxLength={160}
                />
                <Input
                  name="source"
                  placeholder="Book, talk, letter…"
                  aria-label="Source"
                  maxLength={200}
                />
              </div>
              <Textarea
                name="why"
                rows={2}
                placeholder="Why it matters to me. Without this line it fades."
                aria-label="Why it matters to me"
                maxLength={2000}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  name="tags"
                  placeholder="tags, comma-separated"
                  aria-label="Tags"
                  className="min-w-0 flex-1"
                  autoComplete="off"
                />
                <SubmitButton size="sm" pendingLabel="Saving…">
                  Save quote
                </SubmitButton>
              </div>
            </div>
          )}
          {state && !state.ok && (
            <span className="text-destructive w-full text-xs">{state.error}</span>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" size="xs" variant="secondary" onClick={() => setMode('file')}>
            File as task, note or quote
          </Button>
          <Link
            href={`/calendar?capture=${capture.id}`}
            className="text-primary link inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs"
          >
            <CalendarPlusIcon className="size-3" aria-hidden /> Make event
          </Link>
          <Button
            type="button"
            size={lingering ? 'xs' : 'icon-xs'}
            variant="ghost"
            className="ml-auto"
            aria-label={lingering ? undefined : 'Delete capture'}
            disabled={removing}
            onClick={() => startRemove(async () => void (await removeCaptureAction(capture.id)))}
          >
            <Trash2Icon />
            {lingering && 'Let it go'}
          </Button>
        </div>
      )}
    </li>
  );
}
