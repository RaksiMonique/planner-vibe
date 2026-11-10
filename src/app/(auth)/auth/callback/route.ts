import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';
import { COOKIE_OPTIONS } from '@/lib/supabase/cookie';
import { resolveAccessOnSignIn } from '@/features/access/service';
import { sanitizeNext } from '@/features/auth/schema';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = sanitizeNext(searchParams.get('next'));

  type PendingCookie = { name: string; value: string; options: Record<string, unknown> };
  const pending: PendingCookie[] = [];

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: COOKIE_OPTIONS,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) =>
            pending.push({ name, value, options: options ?? {} })
          );
        },
      },
    }
  );

  function withCookies(response: NextResponse) {
    pending.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options as Parameters<NextResponse['cookies']['set']>[2])
    );
    return response;
  }

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(`${origin}/auth/login?error=callback`);
  }

  // Access is granted by the owner (docs/decisions/0005). Allow-listed
  // emails enter at once; everyone else lands on the waiting page.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let approved = false;
  if (user) {
    try {
      const meta = user.user_metadata ?? {};
      const decision = await resolveAccessOnSignIn({
        id: user.id,
        email: user.email,
        displayName: meta.full_name ?? meta.name ?? null,
      });
      approved = decision.status === 'approved';
    } catch (e) {
      // Sign-in must not fail because the planner schema is unreachable;
      // the signed-in layout re-checks access on every page.
      console.error('[auth/callback] resolveAccessOnSignIn failed', e);
    }
  }
  if (!approved) return withCookies(NextResponse.redirect(`${origin}/pending`));

  return withCookies(NextResponse.redirect(`${origin}${next}`));
}
