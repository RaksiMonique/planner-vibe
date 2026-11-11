/** CSV for one table's rows: header from the keys, RFC 4180 quoting, dates as ISO, JSON for objects. */
export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (rows.length === 0) return (columns ?? []).join(',') + '\n';
  const keys =
    columns ??
    Array.from(
      rows.reduce((set, r) => {
        for (const k of Object.keys(r)) set.add(k);
        return set;
      }, new Set<string>())
    );
  const lines = [keys.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => escapeCell(formatCell(row[k]))).join(','));
  }
  return lines.join('\n') + '\n';
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function escapeCell(text: string): string {
  // A leading = + - @ could be run as a formula by a spreadsheet; neutralise it.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
