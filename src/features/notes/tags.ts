export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 40;

/**
 * Tags are typed as one comma-separated line and stored lower-case, trimmed
 * and unique, in the order written. Specific beats broad: "how to never finish
 * anything" is a better tag than "productivity", so spaces are allowed.
 */
export function parseTags(input: string | string[] | null | undefined): string[] {
  const parts = Array.isArray(input) ? input : (input ?? '').split(/[,\n]/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const tag = raw.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length === MAX_TAGS) break;
  }
  return out;
}

export function formatTags(tags: readonly string[]): string {
  return tags.join(', ');
}

/** Tag counts sorted by use, then name; the notes page shows the top few as filters. */
export function rankTags(rows: Array<{ tags: string[] }>): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of rows) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
