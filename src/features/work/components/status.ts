import { ACCENT_BG, ACCENT_FG, type Accent } from '@/lib/accents';
import { cn } from '@/lib/utils';
import type { WorkDayStatus, WorkShift } from '../availability';

/** Cell and chip colours per status, inside the approved palette. */
export const STATUS_CLASSES: Record<WorkDayStatus, string> = {
  working: 'bg-blush text-charcoal',
  on_call: 'bg-peach/50 text-charcoal',
  off: 'bg-card text-muted-foreground',
  leave: 'bg-sage/35 text-charcoal',
  holiday: 'bg-beige/70 text-charcoal',
};

export const STATUS_DOT: Record<WorkDayStatus, string> = {
  working: 'bg-burgundy',
  on_call: 'bg-peach',
  off: 'bg-beige',
  leave: 'bg-sage',
  holiday: 'bg-terracotta',
};

/** A shift chip: filled with the pattern accent for work, outlined for on call, muted for a manual day off. */
export function shiftChipClass(shift: WorkShift): string {
  const accent: Accent = shift.accent ?? 'burgundy';
  if (shift.kind === 'work') return cn(ACCENT_BG[accent], ACCENT_FG[accent]);
  if (shift.kind === 'on_call') return 'bg-card text-foreground border border-dashed';
  return 'bg-card text-muted-foreground border';
}

export function shiftTimeLabel(shift: Pick<WorkShift, 'start' | 'end'>): string | null {
  return shift.start && shift.end ? `${shift.start}–${shift.end}` : null;
}
