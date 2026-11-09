import type { Metadata } from 'next';
import { isValid, parseISO } from 'date-fns';
import { PageHeader } from '@/components/shared/page-header';
import { listSegments } from '@/features/life-segments/service';
import { listProjectOptions } from '@/features/projects/queries';
import { getPreferences } from '@/features/settings/service';
import { TimePage } from '@/features/time/components/time-page';
import type { TimeViewName } from '@/features/time/components/time-view';
import {
  buildTimeRange,
  getRunningEntry,
  listTaskOptions,
  listTemplates,
  rangeFor,
} from '@/features/time/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';

export const metadata: Metadata = { title: 'Time blocking' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TimeRoute({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const prefs = await getPreferences(user.id);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));

  const kind = params.view === 'day' ? 'day' : 'week';
  const requested = typeof params.date === 'string' ? params.date : '';
  const dateKey = requested && isValid(parseISO(requested)) ? requested : todayKey;
  const { from, to } = rangeFor(kind, dateKey, prefs.timeZone, prefs.weekStartsOn);
  const initialView: TimeViewName = kind === 'day' ? 'timeGridDay' : 'timeGridWeek';

  const [segments, projects, tasks, templates, running, initial] = await Promise.all([
    listSegments(user.id),
    listProjectOptions(user.id),
    listTaskOptions(user.id),
    listTemplates(user.id),
    getRunningEntry(user.id),
    buildTimeRange(user.id, from, to, prefs.timeZone),
  ]);
  const segmentById = new Map(segments.map((s) => [s.id, s]));
  const runningSegment = running ? segmentById.get(running.lifeSegmentId) : null;

  return (
    <>
      <PageHeader
        title="Time blocking"
        description="Plan the week in blocks, log what actually happened, and compare the two. Drag a slot to add a block."
      />
      <TimePage
        initial={initial}
        initialView={initialView}
        initialDate={dateKey}
        todayKey={todayKey}
        weekStartsOn={prefs.weekStartsOn}
        segments={segments.map((s) => ({ id: s.id, name: s.name }))}
        projects={projects.map((p) => ({ id: p.id, title: p.title }))}
        tasks={tasks}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          kind: t.kind,
          blockCount: t.blocks.length,
        }))}
        running={
          running
            ? {
                id: running.id,
                startedAt: running.startedAt.toISOString(),
                segmentName: runningSegment?.name ?? 'Unknown segment',
                accent: runningSegment?.accent ?? 'beige',
                note: running.note,
              }
            : null
        }
        labels={{
          segments: Object.fromEntries(
            segments.map((s) => [s.id, { name: s.name, accent: s.accent }])
          ),
          projects: Object.fromEntries(projects.map((p) => [p.id, p.title])),
        }}
      />
    </>
  );
}
