import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { removeSubscription, saveSubscription } from '@/features/reminders/push';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const subscription = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = subscription.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Not a push subscription.' }, { status: 400 });
  await saveSubscription(user.id, parsed.data, request.headers.get('user-agent'));
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = z.object({ endpoint: z.url() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Missing endpoint.' }, { status: 400 });
  await removeSubscription(user.id, parsed.data.endpoint);
  return Response.json({ ok: true });
}
