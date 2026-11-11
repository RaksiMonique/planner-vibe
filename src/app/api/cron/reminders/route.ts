import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { runFrequent } from '@/features/reminders/cron';
import { authorizeCron } from '@/features/reminders/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** For an external scheduler every 10 to 15 minutes: reminders near their time, digests at the chosen hour. */
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const summary = await runFrequent(new Date(), env.NEXT_PUBLIC_SITE_URL);
  return Response.json(summary);
}
