import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import type { ReviewLink } from '../queries';

type Stats = {
  goalProgress: number;
  milestonesDone: number;
  milestonesTotal: number;
  tasksDone: number;
  tasksTotal: number;
};

function Tile({ label, value, detail }: { label: string; value: string; detail: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="font-heading text-2xl leading-tight">{value}</dd>
        <dd className="text-muted-foreground text-xs">{detail}</dd>
      </CardContent>
    </Card>
  );
}

/** The four numbers that answer "how is this period going?" */
export function PeriodStats({
  stats,
  review,
  reviewLabel,
}: {
  stats: Stats;
  review: ReviewLink;
  reviewLabel: string;
}) {
  return (
    <dl className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label="Objectives" value={`${stats.goalProgress}%`} detail="average progress" />
      <Tile
        label="Milestones"
        value={`${stats.milestonesDone}/${stats.milestonesTotal}`}
        detail="reached"
      />
      <Tile label="Tasks" value={`${stats.tasksDone}/${stats.tasksTotal}`} detail="done" />
      <Tile
        label={reviewLabel}
        value={review ? (review.completedAt ? 'Done' : 'Open') : 'Not yet'}
        detail={
          <Link
            href={review ? `/reviews/${review.id}` : '/reviews'}
            className="text-primary underline-offset-4 hover:underline"
          >
            {review ? (review.completedAt ? 'Read it' : 'Continue') : 'Start it'}
          </Link>
        }
      />
    </dl>
  );
}
