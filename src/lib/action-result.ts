import { z, type ZodError } from 'zod';
import { AppError, FALLBACK_ERROR } from './errors';

/**
 * Every server action returns one of these so client forms can render the
 * outcome without try/catch gymnastics. `fieldErrors` keys match form names.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string[] | undefined>
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function fromZodError(err: ZodError): ActionResult<never> {
  const flat = z.flattenError(err);
  return fail('Some of that information is missing or invalid.', flat.fieldErrors);
}

/** Maps anything thrown inside an action to a user-facing result. */
export function fromError(e: unknown): ActionResult<never> {
  if (e instanceof AppError) return fail(e.message);
  // Next.js redirect() and notFound() throw; let them through.
  if (e && typeof e === 'object' && 'digest' in e) throw e;
  console.error(e);
  return fail(FALLBACK_ERROR);
}

/** Pulls plain values out of FormData, turning '' into undefined and 'on' into true. */
export function formValues(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue;
    if (key.endsWith('[]')) {
      const k = key.slice(0, -2);
      const list = (out[k] as string[] | undefined) ?? [];
      list.push(value);
      out[k] = list;
      continue;
    }
    out[key] = value === '' ? undefined : value === 'on' ? true : value;
  }
  return out;
}
