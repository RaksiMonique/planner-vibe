'use server';

import { redirect } from 'next/navigation';
import { env } from '@/env';
import { createClient } from '@/lib/supabase/server';
import { resolveAccessOnSignIn } from '@/features/access/service';
import { magicLinkSchema, passwordSchema, sanitizeNext } from './schema';

export type MagicLinkState =
  | { status: 'idle'; email?: string }
  | { status: 'sent'; email: string }
  | { status: 'error'; message: string; email: string };

function callbackUrl(next: string) {
  return `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function sendMagicLink(
  _prev: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get('email') });
  const typed = String(formData.get('email') ?? '');
  if (!parsed.success) {
    return { status: 'error', message: 'Enter a valid email address.', email: typed };
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
      email: typed,
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

export type PasswordState =
  { status: 'idle'; email?: string } | { status: 'error'; message: string; email: string };

export async function signInWithPassword(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const parsed = passwordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  const typedEmail = String(formData.get('email') ?? '');
  if (!parsed.success) {
    return { status: 'error', message: 'Enter your email and password.', email: typedEmail };
  }
  const next = sanitizeNext(formData.get('next'));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { status: 'error', message: "That email and password don't match.", email: typedEmail };
  }
  let approved = false;
  try {
    const meta = data.user.user_metadata ?? {};
    const decision = await resolveAccessOnSignIn({
      id: data.user.id,
      email: data.user.email,
      displayName: meta.full_name ?? meta.name ?? null,
    });
    approved = decision.status === 'approved';
  } catch (e) {
    console.error('[auth/password] resolveAccessOnSignIn failed', e);
  }
  redirect(approved ? next : '/pending');
}
