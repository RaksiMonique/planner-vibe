'use server';

import { redirect } from 'next/navigation';
import { env } from '@/env';
import { createClient } from '@/lib/supabase/server';
import { magicLinkSchema, sanitizeNext } from './schema';

export type MagicLinkState =
  { status: 'idle' } | { status: 'sent'; email: string } | { status: 'error'; message: string };

function callbackUrl(next: string) {
  return `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function sendMagicLink(
  _prev: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }
  const next = sanitizeNext(formData.get('next'));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl(next) },
  });
  if (error) {
    return {
      status: 'error',
      message: "We couldn't send the link. Check the address and try again.",
    };
  }
  return { status: 'sent', email: parsed.data.email };
}

export async function signInWithGoogle(formData: FormData) {
  const next = sanitizeNext(formData.get('next'));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl(next) },
  });
  if (error || !data.url) redirect('/auth/login?error=oauth');
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
