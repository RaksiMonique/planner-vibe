import type { CalendarItem } from '@/features/calendar/expand';

/**
 * iCalendar (RFC 5545) text for the subscription feed (instructions.md 9.1).
 * Timed items are written in UTC; all-day items as DATE values with an
 * exclusive end. Pure, so the shape is unit-tested without a server.
 */

const TYPE_LABEL: Record<CalendarItem['type'], string> = {
  event: 'Event',
  task: 'Task',
  milestone: 'Milestone',
  time_block: 'Time block',
  shift: 'Shift',
  external: 'External',
};

export function buildIcs(input: {
  name: string;
  items: CalendarItem[];
  now?: Date;
  /** Base of the links placed in each entry, e.g. https://planner.example. */
  siteUrl?: string;
}): string {
  const stamp = formatUtc(input.now ?? new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Life Planner//Calendar feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(input.name)}`,
    'X-PUBLISHED-TTL:PT1H',
  ];
  for (const item of input.items) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${item.id}@life-planner`);
    lines.push(`DTSTAMP:${stamp}`);
    if (item.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dateValue(item.start)}`);
      lines.push(`DTEND;VALUE=DATE:${dateValue(item.end ?? item.start, true)}`);
    } else {
      const start = new Date(item.start);
      const end = item.end ? new Date(item.end) : new Date(start.getTime() + 60 * 60 * 1000);
      lines.push(`DTSTART:${formatUtc(start)}`);
      lines.push(`DTEND:${formatUtc(end)}`);
    }
    lines.push(`SUMMARY:${escapeText(item.title)}`);
    lines.push(`CATEGORIES:${escapeText(TYPE_LABEL[item.type])}`);
    if (input.siteUrl) lines.push(`URL:${input.siteUrl}${hrefFor(item)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function hrefFor(item: CalendarItem): string {
  switch (item.type) {
    case 'task':
      return '/tasks';
    case 'milestone':
      return '/goals';
    case 'time_block':
      return '/time';
    case 'shift':
      return '/work/calendar';
    default:
      return '/calendar';
  }
}

/** yyyy-MM-dd → yyyyMMdd; with `exclusiveEnd` the following day, as DTEND requires. */
export function dateValue(dateKey: string, exclusiveEnd = false): string {
  const key = dateKey.slice(0, 10);
  if (!exclusiveEnd) return key.replace(/-/g, '');
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export function formatUtc(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 octets continue on the next line after a single space. */
export function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8');
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  if (current) parts.push(current);
  return parts.join('\r\n ');
}
