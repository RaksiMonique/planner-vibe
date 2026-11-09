import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';
import { isEmailAllowed, sanitizeNext } from '@/features/auth/schema';
import { ensureProfile } from '@/features/auth/service';

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

  // Optional allow-list: a single-owner deployment rejects everyone else
  // right after the provider round trip, before any page renders.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isEmailAllowed(user?.email, env.AUTH_ALLOWED_EMAILS)) {
    await supabase.auth.signOut();
    return withCookies(NextResponse.redirect(`${origin}/auth/login?error=not_allowed`));
  }

  if (user) {
    try {
      const meta = user.user_metadata ?? {};
      await ensureProfile({
        id: user.id,
        email: user.email,
        displayName: meta.full_name ?? meta.name ?? null,
      });
    } catch (e) {
      // Sign-in must not fail because the planner schema is unreachable;
      // the dashboard shows an empty state and Sentry gets the error.
      console.error('[auth/callback] ensureProfile failed', e);
    }
  }

  return withCookies(NextResponse.redirect(`${origin}${next}`));
}
