// Dev Supabase project. Used by `npm run db:push:dev` and `npm run db:studio:dev`.
import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';
import base from './drizzle.config';

if (existsSync('.env.local.dev')) process.loadEnvFile('.env.local.dev');

export default defineConfig({
  ...base,
  dbCredentials: { url: process.env.DIRECT_URL ?? '' },
});
