import type { Metadata } from 'next';
import Link from 'next/link';
import { parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { SubmitButton } from '@/components/shared/submit-button';
import { listGoals } from '@/features/goals/queries';
import { openReviewAction } from '@/features/reviews/actions';
import { OpenReviewButton } from '@/features/reviews/components/open-review-button';
import { listReviews } from '@/features/reviews/queries';
import {
  PERIOD_KINDS,
  REVIEW_TEMPLATES,
  answeredCount,
  periodFor,
  periodLabel,
  reviewStatus,
  shiftPeriod,
  type ReviewStatus,
} from '@/features/reviews/templates';
import { getPreferences } from '@/features/settings/service';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { requireUser } from '@/lib/auth';
import { toDateKey, todayInZone } from '@/lib/dates';

export const metadata: Metadata = { title: 'Reviews' };
export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<ReviewStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
};

export default async function ReviewsPage() {
  const user = await requireUser();
  const prefs = await getPreferences(user.id);
  const today = todayInZone(prefs.timeZone);
  const [all, goals] = await Promise.all([listReviews(user.id), listGoals(user.id)]);
  const byKey = new Map(all.map((r) => [`${r.kind}:${r.periodStart}:${r.goalId ?? ''}`, r]));

  const periods = PERIOD_KINDS.flatMap((kind) => {
    const current = periodFor(kind, today, prefs.weekStartsOn);
    const prevStart = shiftPeriod(kind, current.start, -1);
    const previous = periodFor(kind, prevStart, prefs.weekStartsOn);
    return [
      { kind, ...current, which: 'current' as const },
      { kind, ...previous, which: 'previous' as const },
    ];
  });

  return (
    <>
      <PageHeader
        eyebrow="Reviews and reflection"
        title="Reviews"
        description="Structured, optional check-ins: a weekly reset, and monthly, quarterly and annual looks back."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {PERIOD_KINDS.map((kind) => {
          const t = REVIEW_TEMPLATES[kind];
          const rows = periods.filter((p) => p.kind === kind);
          return (
            <Card key={kind}>
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  <h2>{t.title}</h2>
                </CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {rows.map((p) => {
                  const startKey = toDateKey(p.start);
                  const review = byKey.get(`${kind}:${startKey}:`) ?? null;
                  const status = reviewStatus(review, t.prompts);
                  const answered = review ? answeredCount(review.answers, t.prompts) : 0;
                  return (
                    <div
                      key={startKey}
                      className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium">
                          {periodLabel(kind, p.start, p.end)}
                          {p.which === 'current' && (
                            <span className="text-muted-foreground font-normal"> · now</span>
                          )}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {STATUS_LABEL[status]}
                          {status === 'in_progress' && ` · ${answered} of ${t.prompts.length}`}
                        </span>
                      </div>
                      {review ? (
                        <Link
                          href={`/reviews/${review.id}`}
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          {status === 'complete' ? 'Open' : 'Continue'}
                        </Link>
                      ) : (
                        <OpenReviewButton
                          kind={kind}
                          date={startKey}
                          label="Start"
                          variant={p.which === 'current' ? 'default' : 'outline'}
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              <h2>{REVIEW_TEMPLATES.goal.title}</h2>
            </CardTitle>
            <CardDescription>{REVIEW_TEMPLATES.goal.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No active goals yet.{' '}
                <Link href="/goals" className="text-primary hover:underline">
                  Open goals
                </Link>
              </p>
            ) : (
              <form action={openReviewAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="kind" value="goal" />
                <NativeSelect name="goalId" aria-label="Goal" className="w-auto min-w-48 flex-1">
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </NativeSelect>
                <SubmitButton size="sm" pendingLabel="Opening…">
                  Review this goal
                </SubmitButton>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              <h2>Past reviews</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {all.length === 0 ? (
              <EmptyState
                title="No reviews yet"
                description="Start with this week's reset above; it takes ten minutes."
              />
            ) : (
              <ul className="divide-y">
                {all.map((r) => {
                  const t = REVIEW_TEMPLATES[r.kind];
                  const status = reviewStatus(r, t.prompts);
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                      <Link href={`/reviews/${r.id}`} className="min-w-0 flex-1 hover:underline">
                        <span className="text-sm font-medium">
                          {t.title}
                          {r.goalTitle ? `: ${r.goalTitle}` : ''}
                        </span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {periodLabel(r.kind, parseISO(r.periodStart), parseISO(r.periodEnd))}
                        </span>
                      </Link>
                      <Badge variant={status === 'complete' ? 'secondary' : 'outline'}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
