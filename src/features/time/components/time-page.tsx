'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getTimeRange, loadBlock, loadEntry, moveBlockAction } from '../actions';
import type { MoveBlockInput } from '../schema';
import type { TimeRangeData } from '../service';
import { AnalysisPanel, type LabelMaps } from './analysis-panel';
import {
  BlockDialog,
  type BlockDialogValues,
  type ProjectOption,
  type SegmentOption,
  type TaskOption,
} from './block-dialog';
import { EntryDialog, type EntryDialogValues } from './entry-dialog';
import { StickyNotes } from './sticky-notes';
import { TemplatesPanel, type TemplateView } from './templates-panel';
import { TimerPanel, type RunningEntryView } from './timer-panel';
import type { TimeViewName } from './time-view';

// FullCalendar measures the DOM, so it only renders on the client.
const TimeView = dynamic(() => import('./time-view').then((m) => m.TimeView), {
  ssr: false,
  loading: () => <div className="bg-card h-[60vh] animate-pulse rounded-xl border" />,
});

const pad = (n: number) => String(n).padStart(2, '0');
const localDateTime = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const localDate = (d: Date) => localDateTime(d).slice(0, 10);

export function TimePage({
  initial,
  initialView,
  initialDate,
  todayKey,
  weekStartsOn,
  segments,
  projects,
  tasks,
  templates,
  running,
  labels,
}: {
  initial: TimeRangeData;
  initialView: TimeViewName;
  initialDate: string;
  todayKey: string;
  weekStartsOn: number;
  segments: SegmentOption[];
  projects: ProjectOption[];
  tasks: TaskOption[];
  templates: TemplateView[];
  running: RunningEntryView | null;
  labels: LabelMaps;
}) {
  const router = useRouter();
  const [data, setData] = useState<TimeRangeData>(initial);
  const [current, setCurrent] = useState<{ from: Date; to: Date; view: TimeViewName }>({
    from: new Date(initial.from),
    to: new Date(initial.to),
    view: initialView,
  });
  const [showActual, setShowActual] = useState(true);
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; values: BlockDialogValues }>({
    open: false,
    values: {},
  });
  const [entryDialog, setEntryDialog] = useState<{ open: boolean; values: EntryDialogValues }>({
    open: false,
    values: {},
  });
  const inflight = useRef<string | null>(null);

  const loadRange = useCallback(async (from: Date, to: Date) => {
    const key = `${from.toISOString()}|${to.toISOString()}`;
    inflight.current = key;
    const result = await getTimeRange(from.toISOString(), to.toISOString());
    if (inflight.current !== key) return; // a newer range won
    if (result.ok) setData(result.data);
  }, []);

  const handleRangeChange = useCallback(
    (from: Date, to: Date, view: TimeViewName) => {
      setCurrent({ from, to, view });
      const url = `/time?view=${view === 'timeGridDay' ? 'day' : 'week'}&date=${localDate(from)}`;
      window.history.replaceState(null, '', url);
      if (from.toISOString() === data.from && to.toISOString() === data.to) return;
      void loadRange(from, to);
    },
    [data.from, data.to, loadRange]
  );

  /** Re-reads the visible range and the server-rendered lists (templates, timer). */
  const refresh = useCallback(() => {
    void loadRange(current.from, current.to);
    router.refresh();
  }, [current.from, current.to, loadRange, router]);

  // Keep the running timer's elapsed display and overlay reasonably fresh.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => void loadRange(current.from, current.to), 60_000);
    return () => window.clearInterval(id);
  }, [running, current.from, current.to, loadRange]);

  function openNewBlock(defaults?: { start: Date; end: Date }) {
    const values: BlockDialogValues = {};
    if (defaults) {
      const minutes = Math.round((defaults.end.getTime() - defaults.start.getTime()) / 60000);
      values.startsAt = localDateTime(defaults.start);
      if ([15, 30, 60, 120, 180].includes(minutes)) values.duration = String(minutes);
      else {
        values.duration = 'custom';
        values.endsAt = localDateTime(defaults.end);
      }
    } else {
      const start = new Date();
      start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
      values.startsAt = localDateTime(start);
      values.duration = '60';
    }
    setBlockDialog({ open: true, values });
  }

  async function openBlock(sourceId: string) {
    const result = await loadBlock(sourceId);
    if (result.ok) setBlockDialog({ open: true, values: result.data });
  }

  async function openEntry(id: string) {
    const result = await loadEntry(id);
    if (result.ok) setEntryDialog({ open: true, values: result.data });
  }

  function logTimeFor(block: BlockDialogValues) {
    setBlockDialog((d) => ({ ...d, open: false }));
    setEntryDialog({
      open: true,
      values: {
        timeBlockId: block.id,
        lifeSegmentId: block.lifeSegmentId,
        projectId: block.projectId,
        taskId: block.taskId,
        startedAt: block.startsAt,
        endedAt: block.endsAt,
        note: block.title,
      },
    });
  }

  async function handleMove(input: MoveBlockInput) {
    const result = await moveBlockAction(input);
    if (result.ok) refresh();
    return result.ok;
  }

  const visibleKind = current.view === 'timeGridDay' ? 'day' : 'week';
  const visibleDate = localDate(current.from);

  return (
    <div className="flex flex-col gap-4">
      <TimerPanel running={running} segments={segments} onChanged={refresh} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id="show-actual" size="sm" checked={showActual} onCheckedChange={setShowActual} />
          <Label htmlFor="show-actual" className="text-xs">
            Show logged time
          </Label>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => openNewBlock()}>
          <PlusIcon data-icon="inline-start" />
          New block
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setEntryDialog({ open: true, values: { startedAt: localDateTime(new Date()) } })
          }
        >
          Log time
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <TimeView
          blocks={data.blocks}
          entries={data.entries}
          showActual={showActual}
          weekStartsOn={weekStartsOn}
          initialView={initialView}
          initialDate={initialDate}
          onRangeChange={handleRangeChange}
          onCreate={openNewBlock}
          onOpenBlock={(id) => void openBlock(id)}
          onOpenEntry={(id) => void openEntry(id)}
          onMove={handleMove}
        />
        <div className="flex flex-col gap-4">
          <StickyNotes
            stickies={data.stickies}
            defaultDate={visibleKind === 'day' ? visibleDate : todayKey}
            onChanged={refresh}
          />
          <TemplatesPanel
            templates={templates}
            segments={segments}
            visibleDate={visibleDate}
            visibleKind={visibleKind}
            onChanged={refresh}
          />
        </div>
      </div>

      <AnalysisPanel analysis={data.analysis} labels={labels} />

      <BlockDialog
        open={blockDialog.open}
        onOpenChange={(open) => setBlockDialog((d) => ({ ...d, open }))}
        values={blockDialog.values}
        segments={segments}
        projects={projects}
        tasks={tasks}
        onSaved={() => {
          setBlockDialog((d) => ({ ...d, open: false }));
          refresh();
        }}
        onLogTime={logTimeFor}
      />
      <EntryDialog
        open={entryDialog.open}
        onOpenChange={(open) => setEntryDialog((d) => ({ ...d, open }))}
        values={entryDialog.values}
        segments={segments}
        projects={projects}
        tasks={tasks}
        onSaved={() => {
          setEntryDialog((d) => ({ ...d, open: false }));
          refresh();
        }}
      />
    </div>
  );
}
