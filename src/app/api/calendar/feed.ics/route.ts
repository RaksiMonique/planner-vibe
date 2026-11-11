import { addDays } from 'date-fns';
import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { buildCalendarItems } from '@/features/calendar/service';
import { buildIcs } from '@/features/integrations/ics';
import { findUserIdByIcsToken } from '@/features/integrations/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar/feed.ics?token=… (instructions.md 9.1): a read-only
 * subscription for Apple Calendar, Google Calendar and Outlook. The token is
 * the only credential; rotating it in Settings invalidates old URLs.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const userId = await findUserIdByIcsToken(token);
  if (!userId) return new Response('Not found', { status: 404 });
  const now = new Date();
  const items = await buildCalendarItems(userId, addDays(now, -30), addDays(now, 365));
  const body = buildIcs({ name: 'Life Planner', items, now, siteUrl: env.NEXT_PUBLIC_SITE_URL });
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="life-planner.ics"',
      'Cache-Control': 'private, max-age=600',
    },
  });
}
