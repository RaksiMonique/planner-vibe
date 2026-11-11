import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';
import { emailFromIdToken, exchangeCode } from '@/features/integrations/google';
import { saveConnection, syncGoogle } from '@/features/integrations/google-sync';
import { getAuthUser } from '@/lib/auth';
import { verifySignedValue } from '@/lib/crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Google sends the user back here with a code; the state must match the cookie and the user. */
export async function GET(request: NextRequest) {
  const back = new URL('/settings/integrations', env.NEXT_PUBLIC_SITE_URL);
  const user = await getAuthUser();
  if (!user) return NextResponse.redirect(new URL('/auth/login', env.NEXT_PUBLIC_SITE_URL));
  const params = request.nextUrl.searchParams;
  const jar = await cookies();
  const expected = jar.get('google_oauth_state')?.value;
  jar.delete('google_oauth_state');
  const state = params.get('state') ?? '';
  const verified = verifySignedValue(state);
  if (
    params.get('error') ||
    !expected ||
    expected !== state ||
    !verified?.startsWith(`${user.id}:`)
  ) {
    back.searchParams.set('error', 'google_failed');
    return NextResponse.redirect(back);
  }
  try {
    const tokens = await exchangeCode({
      code: params.get('code') ?? '',
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
    });
    await saveConnection(user.id, tokens, emailFromIdToken(tokens.id_token));
    await syncGoogle(user.id, { full: true });
    back.searchParams.set('google', 'connected');
  } catch (e) {
    console.error('[google] connect failed', e);
    back.searchParams.set('error', 'google_failed');
  }
  return NextResponse.redirect(back);
}
