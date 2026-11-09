import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SegmentBadge } from '@/components/shared/segment-badge';
import type { StudyRow } from '../queries';
import { PRIORITY_LABELS, STUDY_KIND_LABELS, STUDY_STATUS_LABELS } from '../schema';

export function StudyCard({ study, highlight }: { study: StudyRow; highlight?: string }) {
  return (
    <Card size="sm" className={highlight ? 'ring-primary/40' : undefined}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/bible/${study.id}`}
            className="font-heading min-w-0 flex-1 text-lg hover:underline"
          >
            {study.title}
          </Link>
          {highlight && <Badge>{highlight}</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <SegmentBadge name={study.segment.name} accent={study.segment.accent} />
          <Badge variant="outline">{STUDY_KIND_LABELS[study.kind]}</Badge>
          <Badge variant={study.priority === 'high' ? 'secondary' : 'outline'}>
            {PRIORITY_LABELS[study.priority]} priority
          </Badge>
          <Badge variant="outline">{STUDY_STATUS_LABELS[study.status]}</Badge>
        </div>
        {study.lastStudiedAt && (
          <p className="text-muted-foreground text-xs">
            Last studied {format(study.lastStudiedAt, 'd MMM yyyy')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
