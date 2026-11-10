// Prints a one-time sign-in link for a user, using the dev project's service
// role key from the env file dotenv loaded. Development only: the service role
// key never ships, and the link signs in whoever opens it.
//
//   npm run dev:login                 # first address in AUTH_ALLOWED_EMAILS
//   npm run dev:login -- you@x.com    # a specific address
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';
const email = process.argv[2] ?? (process.env.AUTH_ALLOWED_EMAILS ?? '').split(',')[0]?.trim();
if (!url || !key || !email) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and an email.');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
const { data: list } = await admin.auth.admin.listUsers();
if (!list.users.some((u) => u.email === email)) {
  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
}
const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
if (error) throw error;
console.log(
  `${site}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/dashboard`
);
