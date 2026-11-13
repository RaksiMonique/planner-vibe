import { addMinutes, differenceInMinutes, format, parseISO } from 'date-fns';

/** `datetime-local` values look like 2026-11-12T14:30 and sort as text. */
const LOCAL = "yyyy-MM-dd'T'HH:mm";
const DEFAULT_MINUTES = 60;

/**
 * Where the end should land after the start changes: it keeps the event's
 * length when it had a valid one, and otherwise sits an hour after the start.
 * An empty start leaves the end alone.
 */
export function endAfterStart(end: string, previousStart: string, nextStart: string): string {
  if (!nextStart) return end;
  const hadLength = Boolean(previousStart && end && end > previousStart);
  const minutes = hadLength
    ? differenceInMinutes(parseISO(end), parseISO(previousStart))
    : DEFAULT_MINUTES;
  return format(addMinutes(parseISO(nextStart), minutes), LOCAL);
}

/** True once both times are set and the end is not after the start. */
export function endsTooEarly(start: string, end: string): boolean {
  return Boolean(start && end) && end <= start;
}
