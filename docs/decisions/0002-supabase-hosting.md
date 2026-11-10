# 0002: Production shares nothing; development shares a project but not a schema

Date: 2026-11-07 (final revision of this decision)

## Context

The planner belongs to a different company from the owner's other application that established the stack. The two must never be able to make each other vulnerable.

## Decision

- **Separate everything, in every environment.** The planner has its own Supabase organisation and projects (production, and a dev project if a hosted one is wanted), its own Vercel project, its own domain, its own Sentry project, its own secrets and its own repository. Nothing is shared: no database, no auth users, no storage bucket, no API keys, no accounts where that can be avoided.
- **Development** (decided 2026-11-08): the two teams share one development Supabase project, and the planner lives there in its own `planner` schema, with its own storage bucket and a trigger named for it. The schema filter, separate migration journal and guardrail test mean the planner's tooling cannot reach the other team's `public` tables. Logins are shared in development only. Automated tests and seeding never use that project: they run on the local Docker stack through `.env.test.local`, which refuses any hosted URL.
- **Own session cookie** (2026-11-10): the planner names its Supabase session cookie `planner-auth` (`src/lib/supabase/cookie.ts`) instead of the default derived from the project id. In development the shared project would otherwise give both apps the same cookie on localhost, and a sign-in to one would appear in the other.
- **Schema isolation stays as defence in depth.** Every table lives in `pgSchema('planner')`, drizzle-kit uses `schemaFilter: ['planner']`, and `src/db/guardrails.test.ts` fails on any reference to the `public` schema or to the other application, in code and in docs.

## Consequences

- The Supabase Free plan is per organisation, so a new organisation gives the planner its own free projects without touching the other company's plan. If the account cannot hold a second organisation, use a separate account.
- Engineering conventions were copied once, as files, when the project was scaffolded. No secrets, data or connections came with them, and the other repository is not consulted again.
- The planner's auth users are its own, so a true account deletion can be added later; today's "delete all planner data" keeps working (decision 0004).
