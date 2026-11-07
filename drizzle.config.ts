// Production / default config. drizzle-kit reads .env.local (Next.js convention)
// when it exists; `drizzle-kit generate` needs no database and no env file.
import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

export default defineConfig({
  dialect: 'postgresql',
  // Domain files only: index.ts re-exports the same tables and must not be scanned twice.
  schema: [
    './src/db/schema/profiles.ts',
    './src/db/schema/organisation.ts',
    './src/db/schema/planning.ts',
    './src/db/schema/scheduling.ts',
    './src/db/schema/tracking.ts',
    './src/db/schema/system.ts',
    './src/db/schema/legacy.ts',
  ],
  out: './drizzle',
  // The planner shares the finance app's Supabase projects. Only the
  // `planner` schema is managed here; without this filter `push` would try
  // to drop every finance-app table in `public`.
  schemaFilter: ['planner'],
  migrations: { table: '__drizzle_migrations', schema: 'planner' },
  // DIRECT_URL (not the pooler) for migrations: bypasses pgBouncer.
  dbCredentials: { url: process.env.DIRECT_URL ?? '' },
  verbose: true,
  strict: true,
});
