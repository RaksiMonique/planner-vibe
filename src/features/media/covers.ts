import 'server-only';
import { signedImageUrls } from '@/lib/storage';

/** `cover_url` holds either a web address or `storage:<object path>` for an uploaded cover. */
export const STORAGE_PREFIX = 'storage:';

export function isStoredCover(coverUrl: string | null | undefined): boolean {
  return !!coverUrl && coverUrl.startsWith(STORAGE_PREFIX);
}

export function storedPath(coverUrl: string | null | undefined): string | null {
  return isStoredCover(coverUrl) ? coverUrl!.slice(STORAGE_PREFIX.length) : null;
}

/** Resolves every item's cover to something an <img> can show, keyed by item id. */
export async function resolveCoverSrcs(
  items: Array<{ id: string; coverUrl: string | null }>
): Promise<Record<string, string>> {
  const stored = items.map((i) => storedPath(i.coverUrl)).filter((p): p is string => !!p);
  const signed = await signedImageUrls(stored);
  const out: Record<string, string> = {};
  for (const item of items) {
    if (!item.coverUrl) continue;
    const path = storedPath(item.coverUrl);
    const src = path ? signed[path] : item.coverUrl;
    if (src) out[item.id] = src;
  }
  return out;
}
