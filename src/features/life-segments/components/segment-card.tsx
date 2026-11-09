import Link from 'next/link';
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentDot } from '@/components/shared/segment-badge';
import { cn } from '@/lib/utils';
import { setSegmentArchivedAction } from '../actions';
import type { LifeSegment } from '../service';
import { SegmentFormDialog } from './segment-form-dialog';

export function SegmentCard({
  segment,
  openTasks,
  activeGoals,
  activeProjects,
}: {
  segment: LifeSegment;
  openTasks: number;
  activeGoals: number;
  activeProjects: number;
}) {
  const archived = !!segment.archivedAt;
  const stats: Array<[string, number]> = [
    ['Open tasks', openTasks],
    ['Goals', activeGoals],
    ['Projects', activeProjects],
  ];
  return (
    <Card size="sm" className={cn('h-full', archived && 'opacity-70')}>
      <CardHeader className="items-center">
        <CardTitle className="font-heading text-lg">
          <Link
            href={`/segments/${segment.slug}`}
            className="flex items-center gap-2 hover:underline"
          >
            <SegmentDot accent={segment.accent} className="size-3" />
            {segment.name}
          </Link>
        </CardTitle>
        <CardAction>
          <SegmentFormDialog
            segment={segment}
            variant="ghost"
            trigger={
              <>
                <PencilIcon data-icon="inline-start" />
                Edit
              </>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid grid-cols-3 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-muted/60 rounded-lg px-2 py-1.5 text-center">
              <dt className="text-muted-foreground text-[11px]">{label}</dt>
              <dd className="font-heading text-lg tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            Weight {segment.weight}
            {archived && ' · archived'}
          </span>
          <form action={setSegmentArchivedAction}>
            <input type="hidden" name="id" value={segment.id} />
            <input type="hidden" name="archived" value={archived ? 'false' : 'true'} />
            <Button type="submit" variant="ghost" size="xs">
              {archived ? (
                <ArchiveRestoreIcon data-icon="inline-start" />
              ) : (
                <ArchiveIcon data-icon="inline-start" />
              )}
              {archived ? 'Restore' : 'Archive'}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
