'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { CalendarPlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/shared/submit-button';
import type { LifeSegment } from '@/features/life-segments/service';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { convertCaptureToTaskAction, removeCaptureAction } from '../actions';
import type { Capture } from '../queries';

export function Inbox({ captures, segments }: { captures: Capture[]; segments: LifeSegment[] }) {
  if (captures.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Inbox zero. Captured thoughts land here until they get a Life Segment.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {captures.map((c) => (
        <InboxItem key={c.id} capture={c} segments={segments} />
      ))}
    </ul>
  );
}

function InboxItem({ capture, segments }: { capture: Capture; segments: LifeSegment[] }) {
  const [filing, setFiling] = useState(false);
  const [state, action] = useActionState(convertCaptureToTaskAction, undefined);
  const [removing, startRemove] = useTransition();

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
      {filing ? (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={capture.id} />
          <NativeSelect
            name="lifeSegmentId"
            aria-label="Life Segment"
            className="w-auto flex-1"
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
          <SubmitButton size="sm" pendingLabel="Filing…">
            File as task
          </SubmitButton>
          <Button type="button" size="sm" variant="ghost" onClick={() => setFiling(false)}>
            Cancel
          </Button>
          {state && !state.ok && (
            <span className="text-destructive w-full text-xs">{state.error}</span>
          )}
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" size="xs" variant="secondary" onClick={() => setFiling(true)}>
            File as task
          </Button>
          <Link
            href={`/calendar?capture=${capture.id}`}
            className="text-primary inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs hover:underline"
          >
            <CalendarPlusIcon className="size-3" aria-hidden /> Make event
          </Link>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="ml-auto"
            aria-label="Delete capture"
            disabled={removing}
            onClick={() => startRemove(async () => void (await removeCaptureAction(capture.id)))}
          >
            <Trash2Icon />
          </Button>
        </div>
      )}
    </li>
  );
}
