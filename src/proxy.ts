import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_OPTIONS } from '@/lib/supabase/cookie';

// Pages that render without a session. Everything else requires one.
const PUBLIC_PATHS = new Set(['/']);

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname);
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${supabaseUrl} https://*.ingest.sentry.io https://*.ingest.us.sentry.io`,
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith('/auth');
  const isApiRoute = pathname.startsWith('/api');
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith(COOKIE_OPTIONS.name));

  // Public pages without a session cookie need no Supabase round trip.
  let user: { id: string } | null = null;
  if (hasSessionCookie || !(isPublicPath(pathname) || isApiRoute)) {
    const supabase = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        cookieOptions: COOKIE_OPTIONS,
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies) => {
            cookies.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request: { headers: requestHeaders } });
            cookies.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Supabase unreachable or misconfigured: treat as signed out.
      user = null;
    }
  }

  if (!user && !isAuthRoute && !isApiRoute && !isPublicPath(pathname)) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute && pathname !== '/auth/callback' && pathname !== '/auth/sign-out') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|robots.txt|sitemap.xml).*)'],
};
