import type { Metadata } from 'next';
import { format, parseISO } from 'date-fns';
import { CheckIcon, HandHeartIcon, PencilIcon, PlusIcon, Trash2Icon, UndoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SegmentDot } from '@/components/shared/segment-badge';
import { deletePrayerAction, setPrayerAnsweredAction } from '@/features/faith/actions';
import { PrayerFormDialog } from '@/features/faith/components/prayer-form-dialog';
import { listPrayers, type PrayerRow } from '@/features/faith/queries';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { SegmentFilter } from '@/features/life-segments/components/segment-filter';
import { listSegments } from '@/features/life-segments/service';
import type { SegmentRef } from '@/features/life-segments/types';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Prayer' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function PrayerPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const [segments, prefs] = await Promise.all([listSegments(user.id), getPreferences(user.id)]);
  const todayKey = toDateKey(todayInZone(prefs.timeZone));
  const segment = segments.find((s) => s.slug === str(params.segment));
  const faith = segments.find((s) => s.slug === 'faith') ?? segments[0];
  const showAnswered = params.answered === '1';

  const entries = await listPrayers(user.id, { lifeSegmentId: segment?.id });
  const open = entries.filter((e) => e.kind === 'intention' && !e.answeredAt);
  const answered = entries.filter((e) => e.kind === 'intention' && e.answeredAt);
  const journal = entries.filter((e) => e.kind === 'journal');

  return (
    <>
      <PageHeader
        title="Prayer"
        description="Intentions to keep praying for, and a journal of how prayer has gone."
        actions={
          <>
            <PrayerFormDialog
              segments={segments}
              defaultKind="journal"
              defaultSegmentId={segment?.id ?? faith?.id}
              todayKey={todayKey}
              variant="outline"
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  Journal entry
                </>
              }
            />
            <PrayerFormDialog
              segments={segments}
              defaultKind="intention"
              defaultSegmentId={segment?.id ?? faith?.id}
              todayKey={todayKey}
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  New intention
                </>
              }
            />
          </>
        }
      />
      <SegmentFilter
        basePath="/prayer"
        segments={segments}
        current={segment?.slug}
        extra={{ answered: showAnswered ? '1' : undefined }}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-lg">
              <HandHeartIcon className="text-primary size-4" aria-hidden />
              Intentions{' '}
              <span className="text-muted-foreground text-sm font-normal">
                ({open.length} open)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {open.length === 0 ? (
              <EmptyState
                icon={HandHeartIcon}
                title="No open intentions"
                description="Add the people and situations you are praying for."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {open.map((e) => (
                  <IntentionRow key={e.id} entry={e} segments={segments} todayKey={todayKey} />
                ))}
              </ul>
            )}
            {answered.length > 0 && (
              <details open={showAnswered} className="border-t pt-3">
                <summary className="text-muted-foreground cursor-pointer text-sm">
                  Answered ({answered.length})
                </summary>
                <ul className="mt-2 flex flex-col gap-2">
                  {answered.map((e) => (
                    <IntentionRow key={e.id} entry={e} segments={segments} todayKey={todayKey} />
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Prayer journal</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {journal.length === 0 ? (
              <p className="text-muted-foreground text-sm">No journal entries yet.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {journal.map((e) => (
                  <li key={e.id} className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground flex items-center gap-2 text-xs">
                        <SegmentDot accent={e.segment.accent} />
                        {format(parseISO(e.date), 'EEEE d MMMM yyyy')}
                      </p>
                      <p className="font-medium">{e.title}</p>
                      {e.content && <p className="text-sm whitespace-pre-line">{e.content}</p>}
                    </div>
                    <PrayerFormDialog
                      segments={segments}
                      entry={e}
                      todayKey={todayKey}
                      variant="ghost"
                      size="icon-xs"
                      trigger={<PencilIcon aria-label="Edit entry" />}
                    />
                    <ConfirmActionButton
                      action={deletePrayerAction}
                      fields={{ id: e.id }}
                      title="Delete this entry?"
                      variant="ghost"
                      size="icon-xs"
                      trigger={<Trash2Icon aria-label="Delete entry" />}
                    />
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function IntentionRow({
  entry,
  segments,
  todayKey,
}: {
  entry: PrayerRow;
  segments: SegmentRef[];
  todayKey: string;
}) {
  const answered = Boolean(entry.answeredAt);
  return (
    <li className="flex items-start gap-3">
      <form action={setPrayerAnsweredAction} className="mt-0.5">
        <input type="hidden" name="id" value={entry.id} />
        <input type="hidden" name="answered" value={answered ? '' : 'on'} />
        <Button
          type="submit"
          variant={answered ? 'secondary' : 'outline'}
          size="icon-xs"
          aria-label={answered ? `Reopen ${entry.title}` : `Mark ${entry.title} answered`}
        >
          {answered ? <UndoIcon /> : <CheckIcon />}
        </Button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium', answered && 'text-muted-foreground line-through')}>
          {entry.title}
        </p>
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <SegmentDot accent={entry.segment.accent} />
          {format(parseISO(entry.date), 'd MMM yyyy')}
          {answered && entry.answeredAt && ` · answered ${format(entry.answeredAt, 'd MMM')}`}
        </p>
        {entry.content && <p className="text-sm whitespace-pre-line">{entry.content}</p>}
      </div>
      <PrayerFormDialog
        segments={segments}
        entry={entry}
        todayKey={todayKey}
        variant="ghost"
        size="icon-xs"
        trigger={<PencilIcon aria-label="Edit intention" />}
      />
      <ConfirmActionButton
        action={deletePrayerAction}
        fields={{ id: entry.id }}
        title="Delete this intention?"
        variant="ghost"
        size="icon-xs"
        trigger={<Trash2Icon aria-label="Delete intention" />}
      />
    </li>
  );
}
