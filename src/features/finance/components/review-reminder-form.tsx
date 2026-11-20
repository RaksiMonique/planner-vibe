import { BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setReviewReminderAction } from '../review-actions';

/** Sets up the repeating "Monthly money review" task, or shows it is already there. */
export function ReviewReminderForm({ dueDate }: { dueDate: string | null }) {
  if (dueDate) {
    return (
      <p className="text-muted-foreground text-xs">
        Reminder set: a Monthly money review task repeats each month, next due {dueDate}.
      </p>
    );
  }
  return (
    <form action={setReviewReminderAction}>
      <Button type="submit" size="sm" variant="outline">
        <BellIcon data-icon="inline-start" />
        Remind me every month
      </Button>
    </form>
  );
}
