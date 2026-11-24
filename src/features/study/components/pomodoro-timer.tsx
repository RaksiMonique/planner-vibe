'use client';

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { InfinityIcon, PlayIcon, SquareIcon, TimerIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BreakPicker } from '@/features/breaks/components/break-picker';
import type { BreakIdeaView } from '@/features/breaks/schema';
import type { SegmentRef } from '@/features/life-segments/types';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { cn } from '@/lib/utils';
import { startPomodoroAction, stopPomodoroAction } from '../actions';
import {
  DEFAULT_POMODORO,
  elapsedMs,
  formatClock,
  PHASE_LABELS,
  remainingMs,
  stateFor,
  type PomodoroMode,
  type PomodoroState,
} from '../pomodoro';
import type { CourseOption, SubjectOption } from './study-forms';

export type RunningPomodoro = {
  sessionId: string;
  /** ISO instant. */
  startedAt: string;
  label: string;
};

// The mode is not stored with the session, so this browser remembers it per session.
const modeKey = (sessionId: string) => `pomodoro-mode:${sessionId}`;

function readMode(sessionId: string): PomodoroMode {
  try {
    return window.localStorage.getItem(modeKey(sessionId)) === 'open' ? 'open' : 'intervals';
  } catch {
    return 'intervals';
  }
}

// The stored mode only changes from this component or another tab, which fires `storage`.
function subscribeStorage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function writeMode(sessionId: string, mode: PomodoroMode | null) {
  try {
    if (mode) window.localStorage.setItem(modeKey(sessionId), mode);
    else window.localStorage.removeItem(modeKey(sessionId));
  } catch {
    // Private windows may refuse storage; the session then runs in intervals after a reload.
  }
}

export function PomodoroTimer({
  segments,
  subjects,
  courses,
  running,
  defaultSegmentId,
  defaultCourseId,
  breakIdeas = [],
  todayKey,
}: {
  segments: SegmentRef[];
  subjects: SubjectOption[];
  courses: CourseOption[];
  running: RunningPomodoro | null;
  defaultSegmentId?: string;
  defaultCourseId?: string;
  /** Offered when a break phase comes round. */
  breakIdeas?: BreakIdeaView[];
  /** yyyy-MM-dd in the user's zone, for a break that checks a habit in. */
  todayKey: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<RunningPomodoro | null>(running);
  // A session started here knows its mode; one that arrived with the page reads it back
  // from this browser, with the server assuming intervals until hydration.
  const [chosenMode, setChosenMode] = useState<PomodoroMode | null>(null);
  const storedMode = useSyncExternalStore(
    subscribeStorage,
    () => (session ? readMode(session.sessionId) : 'intervals'),
    () => 'intervals' as PomodoroMode
  );
  const mode: PomodoroMode = chosenMode ?? storedMode;
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState('');
  const settings = DEFAULT_POMODORO;
  // The phase and count follow from the mode, the start time and the clock, so nothing drifts.
  const state: PomodoroState | null = session
    ? stateFor(mode, Date.parse(session.startedAt), now, settings)
    : null;
  const courseRef = useRef<HTMLSelectElement>(null);
  const subjectRef = useRef<HTMLSelectElement>(null);
  const segmentRef = useRef<HTMLSelectElement>(null);

  // One tick per second while a session runs; phases roll over on their own.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  function msOf(s: PomodoroState, cfg: typeof settings) {
    return (
      (s.phase === 'work'
        ? cfg.workMinutes
        : s.phase === 'break'
          ? cfg.breakMinutes
          : cfg.longBreakMinutes) * 60_000
    );
  }

  function start(nextMode: PomodoroMode) {
    setError(null);
    const courseId = courseRef.current?.value || undefined;
    const course = courses.find((c) => c.id === courseId);
    const subjectId = subjectRef.current?.value || course?.subjectId || undefined;
    const lifeSegmentId = segmentRef.current?.value || course?.lifeSegmentId || defaultSegmentId;
    startTransition(async () => {
      const result = await startPomodoroAction({ lifeSegmentId, subjectId, courseId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const label = course?.title ?? subjects.find((s) => s.id === subjectId)?.name ?? 'Study';
      writeMode(result.data.sessionId, nextMode);
      setChosenMode(nextMode);
      setSession({ sessionId: result.data.sessionId, startedAt: result.data.startedAt, label });
      setNow(Date.now());
    });
  }

  function stop() {
    if (!session || !state) return;
    setError(null);
    // An open-ended stretch is saved as time, not as Pomodoros.
    const pomodoros = mode === 'open' ? 0 : state.completedWork;
    startTransition(async () => {
      const result = await stopPomodoroAction({ sessionId: session.sessionId, pomodoros, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      writeMode(session.sessionId, null);
      setChosenMode(null);
      setSession(null);
      setNote('');
      router.refresh();
    });
  }

  if (session && state) {
    const open = mode === 'open';
    const remaining = remainingMs(state, settings, now);
    const total = msOf(state, settings);
    const pct = Math.round(((total - remaining) / total) * 100);
    const onBreak = !open && state.phase !== 'work';
    return (
      <Card className={cn(state.phase === 'work' ? 'ring-primary/40' : 'ring-rose/60')}>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <TimerIcon className="text-primary size-5" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="tracking-eyebrow text-muted-foreground truncate text-xs uppercase">
                {open ? 'Focus, open-ended' : PHASE_LABELS[state.phase]} · {session.label}
              </p>
              {/* Relative to now, so the server and the hydrating client can disagree. */}
              <p
                className="font-heading text-4xl tabular-nums"
                aria-live="polite"
                suppressHydrationWarning
              >
                {formatClock(open ? elapsedMs(state, now) : remaining)}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              {open
                ? 'Stop when you are done.'
                : `${state.completedWork} Pomodoro${state.completedWork === 1 ? '' : 's'} done`}
            </p>
          </div>
          {!open && (
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  'h-full transition-all',
                  state.phase === 'work' ? 'bg-primary' : 'bg-rose'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {onBreak && (
            <div className="bg-secondary rounded-lg px-3 py-2" data-slot="pomodoro-break">
              <BreakPicker
                ideas={breakIdeas}
                preferMovement
                todayKey={todayKey}
                prompt="Away from the screen. Roll a break?"
              />
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="pomodoro-note" className="text-xs">
                What did you work on?
              </Label>
              <Textarea
                id="pomodoro-note"
                rows={1}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button type="button" variant="outline" onClick={stop} disabled={pending}>
              <SquareIcon data-icon="inline-start" />
              {pending ? 'Saving…' : 'Stop and save'}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const defaultCourse = courses.find((c) => c.id === defaultCourseId);
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TimerIcon className="text-primary size-4" aria-hidden />
          <h3 className="font-heading text-lg">Pomodoro</h3>
          <span className="text-muted-foreground text-xs">
            {settings.workMinutes} min focus · {settings.breakMinutes} min break · long break every{' '}
            {settings.cyclesBeforeLongBreak}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="pomodoro-course" className="text-xs">
              Course
            </Label>
            <NativeSelect
              id="pomodoro-course"
              ref={courseRef}
              defaultValue={defaultCourse?.id ?? ''}
            >
              <option value="">None</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="pomodoro-subject" className="text-xs">
              Subject
            </Label>
            <NativeSelect
              id="pomodoro-subject"
              ref={subjectRef}
              defaultValue={defaultCourse?.subjectId ?? ''}
            >
              <option value="">None</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="pomodoro-segment" className="text-xs">
              Life Segment
            </Label>
            <NativeSelect
              id="pomodoro-segment"
              ref={segmentRef}
              defaultValue={
                defaultCourse?.lifeSegmentId ?? defaultSegmentId ?? segments[0]?.id ?? ''
              }
            >
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => start('intervals')} disabled={pending}>
            <PlayIcon data-icon="inline-start" />
            {pending ? 'Starting…' : 'Start Pomodoro'}
          </Button>
          <Button type="button" variant="outline" onClick={() => start('open')} disabled={pending}>
            <InfinityIcon data-icon="inline-start" />
            Stop when done
          </Button>
          <p className="text-muted-foreground text-xs">
            Both start the time tracker. Stop when done counts up and never cuts you off.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
