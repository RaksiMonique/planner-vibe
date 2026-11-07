import { SubmitButton } from '@/components/shared/submit-button';
import { openReviewAction } from '../actions';
import type { ReviewKind } from '../templates';

/** Form button that opens (or creates) the review for a period or goal. */
export function OpenReviewButton({
  kind,
  date,
  goalId,
  label,
  variant = 'default',
}: {
  kind: ReviewKind;
  date?: string;
  goalId?: string;
  label: string;
  variant?: 'default' | 'outline' | 'secondary';
}) {
  return (
    <form action={openReviewAction}>
      <input type="hidden" name="kind" value={kind} />
      {date && <input type="hidden" name="date" value={date} />}
      {goalId && <input type="hidden" name="goalId" value={goalId} />}
      <SubmitButton size="sm" variant={variant} pendingLabel="Opening…">
        {label}
      </SubmitButton>
    </form>
  );
}
