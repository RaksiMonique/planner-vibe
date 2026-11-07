/**
 * Course progress, computed on read: done → 100, dropped keeps what it had,
 * lessons drive it when they exist, otherwise the manual percentage.
 */
export function courseProgress(
  course: { status: string; progress: number },
  lessons: Array<{ completedAt: Date | string | null }>
): number {
  if (course.status === 'done') return 100;
  if (lessons.length > 0) {
    const done = lessons.filter((l) => l.completedAt !== null).length;
    return Math.round((done / lessons.length) * 100);
  }
  return clamp(course.progress);
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type MinutesByKey = Array<{ key: string; label: string; minutes: number }>;

/** Total minutes per subject (null subject grouped as "No subject"), most first. */
export function minutesBySubject(
  sessions: Array<{
    subjectId: string | null;
    subjectName: string | null;
    durationMinutes: number | null;
  }>
): MinutesByKey {
  const totals = new Map<string, { label: string; minutes: number }>();
  for (const s of sessions) {
    const key = s.subjectId ?? 'none';
    const entry = totals.get(key) ?? { label: s.subjectName ?? 'No subject', minutes: 0 };
    entry.minutes += s.durationMinutes ?? 0;
    totals.set(key, entry);
  }
  return [...totals.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function totalMinutes(sessions: Array<{ durationMinutes: number | null }>): number {
  return sessions.reduce((n, s) => n + (s.durationMinutes ?? 0), 0);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
