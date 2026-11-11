import 'server-only';
import type { NextRequest } from 'next/server';
import { env } from '@/env';

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; so must any other scheduler. */
export function authorizeCron(request: NextRequest): Response | null {
  if (!env.CRON_SECRET) {
    return Response.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }
  const header = request.headers.get('authorization') ?? '';
  if (header !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  return null;
}
