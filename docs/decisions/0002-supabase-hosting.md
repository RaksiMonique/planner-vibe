# 0002: The planner shares no infrastructure with any other application

Date: 2026-11-07 (final revision of this decision)

## Context

The planner belongs to a different company from the owner's other application that established the stack. The two must never be able to make each other vulnerable.

## Decision

- **Separate everything, in every environment.** The planner has its own Supabase organisation and projects (production, and a dev project if a hosted one is wanted), its own Vercel project, its own domain, its own Sentry project, its own secrets and its own repository. Nothing is shared: no database, no auth users, no storage bucket, no API keys, no accounts where that can be avoided.
- **Development runs on the local Docker stack** (`npx supabase start`). No development environment is shared with another application.
- **Schema isolation stays as defence in depth.** Every table lives in `pgSchema('planner')`, drizzle-kit uses `schemaFilter: ['planner']`, and `src/db/guardrails.test.ts` fails on any reference to the `public` schema or to the other application, in code and in docs.

## Consequences

- The Supabase Free plan is per organisation, so a new organisation gives the planner its own free projects without touching the other company's plan. If the account cannot hold a second organisation, use a separate account.
- Engineering conventions were copied once, as files, when the project was scaffolded. No secrets, data or connections came with them, and the other repository is not consulted again.
- The planner's auth users are its own, so a true account deletion can be added later; today's "delete all planner data" keeps working (decision 0004).
