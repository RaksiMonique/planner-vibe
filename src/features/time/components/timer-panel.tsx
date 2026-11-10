'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { PlayIcon, SquareIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { SegmentDot } from '@/components/shared/segment-badge';
import { NativeSelect } from '@/features/tasks/components/native-select';
import type { Accent } from '@/lib/accents';
import { startTimerAction, stopTimerAction } from '../actions';
import { formatMinutes } from '../schema';
import type { SegmentOption } from './block-dialog';

export type RunningEntryView = {
  id: string;
  /** ISO instant */
  startedAt: string;
  segmentName: string;
  accent: Accent;
  note: string | null;
};

function useElapsedMinutes(startedAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return 0;
  return Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 60000));
}

export function TimerPanel({
  running,
  segments,
  onChanged,
}: {
  running: RunningEntryView | null;
  segments: SegmentOption[];
  onChanged: () => void;
}) {
  const [state, action] = useActionState(startTimerAction, null);
  const [stopping, setStopping] = useState(false);
  const handled = useRef<typeof state>(null);
  const elapsed = useElapsedMinutes(running?.startedAt ?? null);

  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      onChanged();
    }
  }, [state, onChanged]);

  async function stop() {
    if (!running) return;
    setStopping(true);
    const result = await stopTimerAction(running.id);
    setStopping(false);
    if (result.ok) onChanged();
  }

  if (running) {
    return (
      <div className="bg-secondary flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
        <span
          className="bg-terracotta inline-block size-2.5 animate-pulse rounded-full"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          {/* Elapsed time is relative to now, so the server and the hydrating client can disagree. */}
          <p className="text-sm font-medium" suppressHydrationWarning>
            Timer running · {formatMinutes(elapsed)}
          </p>
          <p className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
            <SegmentDot accent={running.accent} />
            {running.segmentName}
            {running.note ? ` · ${running.note}` : ''}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={stop} disabled={stopping}>
          <SquareIcon data-icon="inline-start" />
          {stopping ? 'Stopping…' : 'Stop'}
        </Button>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="bg-card flex flex-wrap items-end gap-2 rounded-xl border px-4 py-3"
    >
      <div className="flex min-w-40 flex-1 flex-col gap-1">
        <label htmlFor="timer-segment" className="text-muted-foreground text-xs">
          Start a timer for
        </label>
        <NativeSelect id="timer-segment" name="lifeSegmentId" defaultValue={segments[0]?.id ?? ''}>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex min-w-40 flex-1 flex-col gap-1">
        <label htmlFor="timer-note" className="text-muted-foreground text-xs">
          What you are doing
        </label>
        <Input id="timer-note" name="note" placeholder="Optional" />
      </div>
      <SubmitButton size="sm" pendingLabel="Starting…">
        <PlayIcon data-icon="inline-start" />
        Start
      </SubmitButton>
      {state && !state.ok && (
        <p role="alert" className="text-destructive w-full text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}
