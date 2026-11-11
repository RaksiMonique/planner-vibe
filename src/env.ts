import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // Supabase pooler URL (transaction mode), used by the app at runtime
    DATABASE_URL: z.string().min(1),
    // Supabase direct URL, used by drizzle-kit only
    DIRECT_URL: z.string().min(1),
    // Bypasses RLS. Server-only: account deletion, cron jobs, seeding.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().optional(),
    // Verified sender for Resend, e.g. "Life Planner <planner@example.com>"
    EMAIL_FROM: z.string().optional(),
    // Encrypts OAuth tokens at rest; 16+ characters (checked where used)
    TOKEN_ENCRYPTION_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),
    // Bearer secret Vercel Cron sends to /api/cron/* routes
    CRON_SECRET: z.string().optional(),
    // Upstash Redis, optional; rate limiting is disabled when absent
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    // Auth user id the dev seed script writes sample data for
    SEED_USER_ID: z.uuid().optional(),
    // Comma-separated emails allowed to sign in. Unset = anyone (multi-user).
    AUTH_ALLOWED_EMAILS: z.string().optional(),
    // 'true' shows the Google button; the provider must be configured in Supabase first.
    AUTH_GOOGLE: z.string().optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Set by Vercel per deployment target; NODE_ENV is 'production' in both
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SITE_URL: z.url(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    CRON_SECRET: process.env.CRON_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    SEED_USER_ID: process.env.SEED_USER_ID,
    AUTH_ALLOWED_EMAILS: process.env.AUTH_ALLOWED_EMAILS,
    AUTH_GOOGLE: process.env.AUTH_GOOGLE,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },
  // A variable saved blank in a hosting dashboard must count as unset, never fail the build.
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
