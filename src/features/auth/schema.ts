import { z } from 'zod';

export const magicLinkSchema = z.object({
  email: z.email('Enter a valid email address.'),
});

export const passwordSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.').max(200),
});

/** Only same-origin relative paths are honoured as a post-login destination. */
export function sanitizeNext(value: unknown, fallback = '/dashboard'): string {
  const s = typeof value === 'string' ? value : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : fallback;
}

export function isEmailAllowed(email: string | undefined, allowList: string | undefined): boolean {
  if (!allowList?.trim()) return true;
  if (!email) return false;
  const allowed = allowList
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
