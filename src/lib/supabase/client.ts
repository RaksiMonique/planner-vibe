import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/env';
import { COOKIE_OPTIONS } from './cookie';

export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookieOptions: COOKIE_OPTIONS,
  });
}
