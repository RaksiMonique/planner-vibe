import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { runDaily } from '@/features/reminders/cron';
import { authorizeCron } from '@/features/reminders/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Once a day (vercel.json): due reminders, the digest, pruning, and a heartbeat for the database. */
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const summary = await runDaily(new Date(), env.NEXT_PUBLIC_SITE_URL);
  return Response.json(summary);
}
