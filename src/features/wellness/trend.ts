import { averages, type MoodPoint } from './stats';

/** One value per day on the 1 to 5 scale; null where there was no check-in. */
export type Series = Array<number | null>;

export type LineGeometry = {
  /** Polyline point strings, one per run of consecutive days; gaps break the line. */
  runs: string[];
  /** Points with no neighbour on either side, drawn as dots so they are not lost. */
  singles: Array<{ x: number; y: number }>;
};

const fmt = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Maps a series onto an SVG box. Each day sits at the centre of one of `n` equal
 * columns, so a seven-column label row underneath lines up with the points.
 */
export function lineGeometry(
  values: Series,
  { width, height, pad }: { width: number; height: number; pad: number }
): LineGeometry {
  const n = values.length;
  const column = n > 0 ? width / n : width;
  const inner = Math.max(0, height - pad * 2);
  const point = (i: number, v: number) => ({
    x: column * (i + 0.5),
    y: pad + inner * ((5 - Math.min(5, Math.max(1, v))) / 4),
  });
  const runs: string[] = [];
  const singles: Array<{ x: number; y: number }> = [];
  let run: Array<{ x: number; y: number }> = [];
  const flush = () => {
    if (run.length === 1) singles.push(run[0]);
    else if (run.length > 1) runs.push(run.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' '));
    run = [];
  };
  values.forEach((v, i) => {
    if (v === null) flush();
    else run.push(point(i, v));
  });
  flush();
  return { runs, singles };
}

/**
 * One sentence on the week's mood: the average, compared with the week before
 * when that week has check-ins. Null when this week has none.
 */
export function moodSummary(thisWeek: MoodPoint[], lastWeek: MoodPoint[]): string | null {
  const now = averages(thisWeek).mood;
  if (now === null) return null;
  const before = averages(lastWeek).mood;
  if (before === null) return `Mood averaged ${now} this week.`;
  const direction = now > before ? 'up on' : now < before ? 'down on' : 'level with';
  return `Mood averaged ${now} this week, ${direction} last week (${before}).`;
}
