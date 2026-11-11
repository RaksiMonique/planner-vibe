// Dev Supabase project. Used by `npm run db:migrate:dev` and `npm run db:studio:dev`.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'drizzle-kit';
import base from './drizzle.config';

// The base config has already loaded `.env.local`, and process.loadEnvFile never
// overrides a variable that is set, so the dev file must be applied by hand or
// every "dev" command would silently run against the other database.
if (existsSync('.env.local.dev')) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync('.env.local.dev', 'utf8')))) {
    process.env[key] = value;
  }
}

export default defineConfig({
  ...base,
  dbCredentials: { url: process.env.DIRECT_URL ?? '' },
});
