import Link from 'next/link';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { ClipboardCheckIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared/progress-bar';
import { DashboardCard } from '@/features/dashboard/components/dashboard-card';
import { toDateKey, type WeekStartsOn } from '@/lib/dates';
import { findReview } from '../queries';
import {
  answeredCount,
  periodFor,
  periodLabel,
  REVIEW_TEMPLATES,
  reviewStatus,
  shiftPeriod,
  type ReviewStatus,
} from '../templates';
import { OpenReviewButton } from './open-review-button';

const STATUS_LABEL: Record<ReviewStatus, string> = {
  not_started: 'not started',
  in_progress: 'in progress',
  complete: 'complete',
};

/** Where this week's weekly reset stands, with a way in, and last week's in one line. */
export async function ReviewDashboardCard({
  userId,
  todayKey,
  weekStartsOn,
}: {
  userId: string;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
}) {
  const today = parseISO(todayKey);
  const template = REVIEW_TEMPLATES.weekly;
  const current = periodFor('weekly', today, weekStartsOn);
  const previous = periodFor('weekly', shiftPeriod('weekly', current.start, -1), weekStartsOn);
  const nextStart = shiftPeriod('weekly', current.start, 1);
  const currentKey = toDateKey(current.start);
  const [review, last] = await Promise.all([
    findReview(userId, 'weekly', currentKey),
    findReview(userId, 'weekly', toDateKey(previous.start)),
  ]);
  const status = reviewStatus(review, template.prompts);
  const answered = review ? answeredCount(review.answers, template.prompts) : 0;
  const daysLeft = differenceInCalendarDays(current.end, today);
  const lastStatus = last ? reviewStatus(last, template.prompts) : null;

  return (
    <DashboardCard title="Weekly review" icon={ClipboardCheckIcon} href="/reviews" release={6}>
      <p className="text-sm font-medium">{periodLabel('weekly', current.start, current.end)}</p>

      {status === 'complete' && review ? (
        <>
          <p className="text-sm">This week&apos;s review is done.</p>
          <p className="text-muted-foreground text-xs">
            Next week&apos;s is ready from {format(nextStart, 'EEEE d MMMM')}.
          </p>
          <Link href={`/reviews/${review.id}`} className="text-primary link text-sm font-medium">
            Open
          </Link>
        </>
      ) : status === 'in_progress' && review ? (
        <>
          <ProgressBar
            value={Math.round((answered / template.prompts.length) * 100)}
            valueText={`${answered} of ${template.prompts.length} prompts answered`}
          />
          <Link href={`/reviews/${review.id}`} className="text-primary link text-sm font-medium">
            Continue
          </Link>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {daysLeft <= 1
              ? 'The week is nearly over. A few minutes now will close it out.'
              : `Not started yet. The week has ${daysLeft} days to go; the prompts are ready whenever you are.`}
          </p>
          {review ? (
            <Link href={`/reviews/${review.id}`} className="text-primary link text-sm font-medium">
              Continue
            </Link>
          ) : (
            <div>
              <OpenReviewButton
                kind="weekly"
                date={currentKey}
                label="Start"
                variant={daysLeft <= 1 ? 'default' : 'outline'}
              />
            </div>
          )}
        </>
      )}

      {last && lastStatus && (
        <p className="text-muted-foreground text-xs">
          Last week&apos;s review is {STATUS_LABEL[lastStatus]}
          {lastStatus === 'in_progress' &&
            `, ${answeredCount(last.answers, template.prompts)} of ${template.prompts.length}`}
          .{' '}
          <Link href={`/reviews/${last.id}`} className="text-primary link">
            {lastStatus === 'complete' ? 'Open it' : 'Finish it'}
          </Link>
        </p>
      )}
    </DashboardCard>
  );
}
