import { ACCENT_BG, ACCENT_FG, type Accent } from '@/lib/accents';
import { cn } from '@/lib/utils';
import type { WorkDayStatus, WorkShift } from '../availability';

/** Cell and chip colours per status, inside the approved palette. */
export const STATUS_CLASSES: Record<WorkDayStatus, string> = {
  working: 'bg-blush text-plum',
  on_call: 'bg-gold/50 text-plum',
  off: 'bg-card text-muted-foreground',
  leave: 'bg-rose/35 text-plum',
  holiday: 'bg-blush/70 text-plum',
};

export const STATUS_DOT: Record<WorkDayStatus, string> = {
  working: 'bg-plum',
  on_call: 'bg-gold',
  off: 'bg-blush',
  leave: 'bg-rose',
  holiday: 'bg-crimson',
};

/** A shift chip: filled with the pattern accent for work, outlined for on call, muted for a manual day off. */
export function shiftChipClass(shift: WorkShift): string {
  const accent: Accent = shift.accent ?? 'plum';
  if (shift.kind === 'work') return cn(ACCENT_BG[accent], ACCENT_FG[accent]);
  if (shift.kind === 'on_call') return 'bg-card text-foreground border border-dashed';
  return 'bg-card text-muted-foreground border';
}

export function shiftTimeLabel(shift: Pick<WorkShift, 'start' | 'end'>): string | null {
  return shift.start && shift.end ? `${shift.start}–${shift.end}` : null;
}
