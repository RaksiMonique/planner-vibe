import { ProgressBar } from '@/components/shared/progress-bar';
import { cn } from '@/lib/utils';
import { NOT_MEASURED } from '../progress';

/** A goal's progress bar, or a quiet note when nothing measures the goal yet. */
export function GoalProgress({
  progress,
  valueText,
  className,
  valueClassName,
}: {
  progress: number | null;
  valueText?: string;
  className?: string;
  valueClassName?: string;
}) {
  if (progress === null) {
    return (
      <p className={cn('text-muted-foreground text-xs', valueClassName, className)}>
        {NOT_MEASURED}
      </p>
    );
  }
  return (
    <ProgressBar
      value={progress}
      valueText={valueText}
      className={className}
      valueClassName={valueClassName}
    />
  );
}
