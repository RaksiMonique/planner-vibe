// Sets a password for a user on the project the loaded env file points at,
// through the admin API. The password is typed at a hidden prompt so it never
// lands in shell history or the terminal scrollback.
//
//   npm run dev:password -- you@example.com
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
if (!url || !key || !email) {
  console.error(
    'Usage: npm run dev:password -- you@example.com (needs the env file with the service role key)'
  );
  process.exit(1);
}

function ask(question, hidden) {
  const muted = new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output: hidden ? muted : process.stdout,
    terminal: true,
  });
  process.stdout.write(question);
  return new Promise((resolve) =>
    rl.question('', (a) => {
      rl.close();
      process.stdout.write('\n');
      resolve(a);
    })
  );
}

const password = await ask('New password (hidden): ', true);
const again = await ask('Repeat it: ', true);
if (password !== again) {
  console.error('Passwords do not match.');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Use at least 10 characters.');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data: list } = await admin.auth.admin.listUsers();
let user = list.users.find((u) => u.email === email);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  user = data.user;
  console.log(`Created ${email} with that password.`);
} else {
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Password set for ${email}.`);
}
