/**
 * A log's free-form position ("45%", "p. 120", "S2E3") as a percentage when it
 * states one, clamped to 0-100. Null otherwise: pages are not stored against a
 * total, so only an explicit percentage can fill a bar.
 */
export function progressPercent(progress: string | null | undefined): number | null {
  if (!progress) return null;
  const m = /(\d{1,3}(?:\.\d+)?)\s*(?:%|percent|per cent)/i.exec(progress);
  if (!m) return null;
  const value = Math.round(Number(m[1]));
  return Math.min(100, Math.max(0, value));
}
