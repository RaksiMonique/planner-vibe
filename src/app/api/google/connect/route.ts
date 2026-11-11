import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { env } from '@/env';
import { buildAuthUrl, googleConfigured } from '@/features/integrations/google';
import { getAuthUser } from '@/lib/auth';
import { signValue } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

/** Starts the Google OAuth flow for the signed-in user (instructions.md 9.1). */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.redirect(new URL('/auth/login', env.NEXT_PUBLIC_SITE_URL));
  const back = new URL('/settings/integrations', env.NEXT_PUBLIC_SITE_URL);
  if (!googleConfigured() || !env.TOKEN_ENCRYPTION_KEY) {
    back.searchParams.set('error', 'google_not_configured');
    return NextResponse.redirect(back);
  }
  const state = signValue(`${user.id}:${randomUUID()}`);
  const jar = await cookies();
  jar.set('google_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NEXT_PUBLIC_SITE_URL.startsWith('https://'),
    path: '/api/google',
    maxAge: 600,
  });
  return NextResponse.redirect(
    buildAuthUrl({ clientId: env.GOOGLE_CLIENT_ID!, siteUrl: env.NEXT_PUBLIC_SITE_URL, state })
  );
}
