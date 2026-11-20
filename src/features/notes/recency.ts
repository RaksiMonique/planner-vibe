import { differenceInCalendarDays, format, parseISO } from 'date-fns';

/** "today", "yesterday" or "d MMM" for a yyyy-MM-dd key read against the user's today. */
export function relativeDayLabel(dateKey: string, todayKey: string): string {
  const diff = differenceInCalendarDays(parseISO(todayKey), parseISO(dateKey));
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  return format(parseISO(dateKey), 'd MMM');
}

/** A note's title, or its first line when it has none, trimmed to one line. */
export function noteHeading(note: { title: string | null; content: string }, max = 60): string {
  const title = note.title?.trim();
  const text =
    title ||
    note.content
      .split('\n')
      .find((l) => l.trim())
      ?.trim() ||
    'Untitled note';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
