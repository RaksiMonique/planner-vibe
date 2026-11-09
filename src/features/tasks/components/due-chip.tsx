import { format, parseISO } from 'date-fns';
import type { DueStatus } from '@/lib/dates';
import { cn } from '@/lib/utils';

const STYLES: Record<DueStatus, string> = {
  overdue: 'bg-destructive/10 text-destructive',
  today: 'bg-secondary text-secondary-foreground',
  this_week: 'bg-muted text-foreground',
  later: 'border text-muted-foreground',
  none: '',
};

export function dueLabel(dueDate: string | null, status: DueStatus): string {
  if (!dueDate || status === 'none') return '';
  const d = parseISO(dueDate);
  if (status === 'today') return 'Today';
  if (status === 'overdue') return `Overdue · ${format(d, 'd MMM')}`;
  if (status === 'this_week') return format(d, 'EEE d');
  return format(d, 'd MMM');
}

export function DueChip({ dueDate, status }: { dueDate: string | null; status: DueStatus }) {
  const label = dueLabel(dueDate, status);
  if (!label) return null;
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs whitespace-nowrap', STYLES[status])}>
      {label}
    </span>
  );
}
