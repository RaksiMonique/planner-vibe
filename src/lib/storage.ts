import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { ValidationError } from '@/lib/errors';

/** Private bucket created by migration 0007. Object paths always start with the owner's user id. */
export const BUCKET = 'planner';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Uploads an image for a user under `<userId>/<folder>/<uuid>.<ext>` and returns the object path. */
export async function uploadImage(userId: string, folder: string, file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) throw new ValidationError('Only JPEG, PNG, WebP or GIF images.');
  if (file.size > MAX_BYTES) throw new ValidationError('Images must be 10 MB or smaller.');
  const path = `${userId}/${folder.replace(/[^a-z0-9-]/gi, '')}/${randomUUID()}.${EXT[file.type]}`;
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

/** A short-lived URL for a private object. Returns null for empty paths. */
export async function signedImageUrl(
  path: string | null | undefined,
  expiresInSeconds = 60 * 60
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Signed URLs for many paths at once, keyed by path. */
export async function signedImageUrls(
  paths: Array<string | null | undefined>,
  expiresInSeconds = 60 * 60
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return {};
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrls(unique, expiresInSeconds);
  if (error || !data) return {};
  const entries: Array<[string, string]> = [];
  for (const d of data) if (d.path && d.signedUrl) entries.push([d.path, d.signedUrl]);
  return Object.fromEntries(entries);
}

/** Deletes an object; only the owner's prefix is allowed. */
export async function removeImage(userId: string, path: string | null | undefined): Promise<void> {
  if (!path || !path.startsWith(`${userId}/`)) return;
  await createAdminClient().storage.from(BUCKET).remove([path]);
}
