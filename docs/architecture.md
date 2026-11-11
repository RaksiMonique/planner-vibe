# Architecture

One Next.js application (modular monolith). Four layers, each in its own place:

| Layer               | Where                                                    | Rules                                                                            |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Presentation        | `src/app`, `src/components`, `src/features/*/components` | Server components fetch, client components only where interaction needs it       |
| Actions and queries | `src/features/*/actions.ts`, `queries.ts`                | Check auth, validate with the feature's Zod schema, call the service, revalidate |
| Services            | `src/features/*/service.ts`                              | Business logic. Every function takes `userId` and scopes every query by it       |
| Data                | `src/db`                                                 | Drizzle schema with RLS policies, one client, migrations in `drizzle/`           |

## Request flow

1. `src/proxy.ts` runs on every request: sets a nonce-based CSP (so every page renders dynamically; a prerendered page would carry a build-time nonce and the browser would block its scripts), refreshes the Supabase session cookie (named `planner-auth`, see decision 0002), and redirects signed-out users away from protected routes. Public routes are `/`, `/wireframe`, `/auth/*` and `/api/*`.
2. Pages in `src/app/(app)` call `requireUser()` from `src/lib/auth.ts` as a second check and render.
3. Mutations are server actions in the feature folder. Route handlers under `src/app/api` exist only for external clients: exports, feeds, cron.

## Auth

Supabase Auth through `@supabase/ssr`. Browser, server and admin clients live in `src/lib/supabase/`. A database trigger creates the `profiles` and `user_preferences` rows when an auth user is created (see `docs/schema.md`).

## Data access

The app connects with `DATABASE_URL` (pooler) and filters by `user_id` explicitly in every service. RLS policies on every table are the second line of defence.

The planner owns its Supabase projects outright and keeps every table in the `planner` Postgres schema (`docs/decisions/0002`). drizzle-kit is filtered to that schema and application code never queries `public`; `src/db/guardrails.test.ts` enforces both and fails on any reference to other applications.

## Environment

`src/env.ts` validates every variable at build time with Zod. `SKIP_ENV_VALIDATION=true` skips it in CI.

## Design system

Tokens live in `src/app/globals.css` and come from the approved palette in `instructions.md` 2.1. Components are shadcn/ui on Base UI, copied into `src/components/ui` and themed through those tokens.

## Feature folder contract

Every feature under `src/features/<name>` follows the same shape, and other features import only from its `queries.ts` and `service.ts`:

| File          | Role                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`   | Zod schemas for create, update and filters. Shared by forms and actions.                                                                            |
| `queries.ts`  | Read functions other features may call (for example `listTasks`, `listGoals`, `listEventsBetween`). Signatures are a contract: extend, never break. |
| `service.ts`  | Writes and business rules. `userId` first, every query scoped by it, `NotFoundError` for rows that are not the user's.                              |
| `actions.ts`  | Server actions: `requireUser()`, `formValues()` + Zod, call the service, `revalidatePath`, return `ActionResult` from `src/lib/action-result.ts`.   |
| `components/` | The feature's UI. Client components only where interaction needs them.                                                                              |

Pages under `src/app/(app)` are thin: `requireUser()`, load data through queries, render feature components. Progress for goals and projects is computed on read (`features/goals/progress.ts`, `features/projects/queries.ts`), never stored.

## Testing layers

- Vitest for pure logic (dates, recurrence, progress roll-up, import mapping).
- Playwright against the local Supabase stack: `e2e/global.setup.ts` signs the test user in through the app's own `/auth/callback` with a token minted by the service role, then every page test runs with that session on desktop, phone and tablet viewports. Specs import `test` from `e2e/test.ts`, whose `page.goto` waits for the `data-hydrated` mark the root layout sets after React hydrates, because a click or keypress sent before hydration is lost.

## Integrations

`src/features/integrations` holds the ICS feed, the Google Calendar connection (`google.ts` is the API client, `google-sync.ts` the ownership-based sync) and the settings page's actions; `src/features/reminders` holds delivery (`email.ts`, `push.ts`), the digest renderer and the scheduled jobs (`cron.ts`) behind `/api/cron/*`. All of it is off until its keys exist (decision 0007).

## Dashboard

`src/features/dashboard/layout.ts` is the card registry (keys, labels, owning module) and the pure rules for order and hidden cards; `user_preferences.dashboard_layout` stores the user's choice and Settings edits it. `dashboard.tsx` builds every card once and renders the visible ones in order, so a new card is one registry entry plus one render branch.
