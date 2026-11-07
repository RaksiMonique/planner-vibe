import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// For server components and actions inside the (app) route group.
// The proxy already redirects, this is the second check.
export async function requireUser() {
  const user = await getAuthUser();
  if (!user) redirect('/auth/login');
  return user;
}
