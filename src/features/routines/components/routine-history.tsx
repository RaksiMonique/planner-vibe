import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { historyStatus, isScheduledOn, type HistoryStatus } from '../grouping';
import type { RoutineCompletion } from '../queries';

const STYLE: Record<HistoryStatus, string> = {
  done: 'bg-rose border-transparent',
  partial: 'bg-gold border-transparent',
  missed: 'bg-card border-blush',
  unscheduled: 'bg-transparent border-transparent',
};
const LABEL: Record<HistoryStatus, string> = {
  done: 'done',
  partial: 'partly done',
  missed: 'missed',
  unscheduled: 'not scheduled',
};

/** One cell per day, oldest first, for the routine's recent completion history. */
export function RoutineHistory({
  dayKeys,
  daysOfWeek,
  completions,
  todayKey,
}: {
  dayKeys: string[];
  daysOfWeek: number[];
  completions: RoutineCompletion[];
  todayKey: string;
}) {
  return (
    <div className="flex items-center gap-1" aria-label="Recent history">
      {dayKeys.map((key) => {
        const completion = completions.find((c) => c.date === key);
        const scheduled = isScheduledOn(daysOfWeek, key);
        const status = historyStatus(completion, scheduled && key !== todayKey);
        const finalStatus: HistoryStatus =
          status === 'missed' && key === todayKey ? 'unscheduled' : status;
        return (
          <span
            key={key}
            title={`${format(parseISO(key), 'EEE d MMM')}: ${LABEL[finalStatus]}`}
            className={cn(
              'size-3.5 rounded-sm border',
              STYLE[finalStatus],
              key === todayKey && 'ring-primary/40 ring-2'
            )}
          />
        );
      })}
    </div>
  );
}
