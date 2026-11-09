import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { deleteReviewAction } from '@/features/reviews/actions';
import { ReviewForm } from '@/features/reviews/components/review-form';
import { ReviewStatsBlock } from '@/features/reviews/components/review-stats';
import { getReview } from '@/features/reviews/queries';
import { reviewStats } from '@/features/reviews/service';
import { REVIEW_TEMPLATES, periodLabel } from '@/features/reviews/templates';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Review' };
export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [review, prefs] = await Promise.all([getReview(user.id, id), getPreferences(user.id)]);
  if (!review) notFound();
  const template = REVIEW_TEMPLATES[review.kind];
  const stats = await reviewStats(user.id, review, prefs.timeZone);
  const label = periodLabel(review.kind, parseISO(review.periodStart), parseISO(review.periodEnd));

  return (
    <>
      <PageHeader
        eyebrow="Reviews"

        title={review.goalTitle ? `${template.title}: ${review.goalTitle}` : template.title}
        description={`${label}. ${template.description}`}
        actions={
          <>
            <Link href="/reviews" className="text-primary text-sm hover:underline">
              All reviews
            </Link>
            {review.completedAt ? (
              <Badge variant="secondary">Complete</Badge>
            ) : (
              <Badge variant="outline">In progress</Badge>
            )}
            <ConfirmActionButton
              action={deleteReviewAction}
              fields={{ id: review.id }}
              title="Delete this review?"
              description="Your answers are removed."
              trigger="Delete"
              variant="ghost"
            />
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                <h2>The numbers</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewStatsBlock stats={stats} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-8">
          <Card>
            <CardContent className="pt-2">
              <ReviewForm
                review={{
                  id: review.id,
                  answers: review.answers,
                  summary: review.summary,
                  completedAt: review.completedAt,
                }}
                prompts={template.prompts}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
