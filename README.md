# Life Planner

Personal life planner and tracking system. The product spec is [instructions.md](instructions.md); this file covers running the code.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres + Auth), Drizzle ORM, Tailwind CSS 4, shadcn/ui on Base UI. The planner shares no infrastructure with any other application (docs/decisions/0002).

## Setup

1. Node 22 (`.nvmrc`) and npm.
2. `npm install` (also points git hooks at `.githooks/`).
3. Supabase: create an organisation and a production project for the planner alone, then fill `.env.local` from its settings. For development use the local Docker stack described below, which fills `.env.local.dev`. Set `NEXT_PUBLIC_SITE_URL` and `AUTH_ALLOWED_EMAILS` in both files. See `.env.example` for which script reads which file.
4. In each Supabase project enable the Google and Email (magic link) providers and add `http://localhost:3000/auth/callback` (and the production callback URL) to the redirect URLs.
5. Apply the schema to the dev project: `npx dotenv -e .env.local.dev -- npm run db:migrate`. This creates the `planner` schema, the tables and the profile trigger, and backfills your existing user. After that, `npm run db:push:dev` works for quick iteration. Only the `planner` schema is ever touched. See `docs/schema.md`.
6. `npm run dev:dev` and open http://localhost:3000.

The public `/wireframe` page shows the dashboard with sample data and needs no Supabase configuration. Sign in at `/auth/login` to reach the real shell at `/dashboard`.

## Local Supabase for development and tests

Docker runs the whole stack locally, so development never touches a hosted project:

```
npx supabase start -x studio,imgproxy,logflare,vector,edge-runtime,realtime,storage-api,mailpit
npx supabase status -o env        # URLs and keys for .env.local / .env.local.dev
npx dotenv -e .env.local.dev -- npm run db:migrate
npm run db:seed                   # needs SEED_USER_ID, an existing auth user
npm run e2e                       # signs in owner@planner.test through a minted magic link
```

`supabase/config.toml` already allows the `http://localhost:3100/auth/callback` redirect the tests use.

## What exists (Release 1)

| Route                           | What it does                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`                    | Today and this week: priorities, due and overdue tasks, weekly strip, goals, appointments, Inbox, quick capture        |
| `/tasks`                        | List, board and Eisenhower matrix views, task sheet with subtasks and recurrence, filters by segment, project and goal |
| `/goals`, `/goals/[id]`         | Goals by horizon with the parent chain, milestones, linked projects and computed progress                              |
| `/projects`, `/projects/[id]`   | Project workspaces with tasks, milestones and linked goals                                                             |
| `/segments`, `/segments/[slug]` | Life Segments with per-segment goals, projects and tasks                                                               |
| `/calendar`                     | Month, week, day and list views of events, task due dates and milestones; drag to reschedule                           |
| `/settings`, `/settings/data`   | Profile, preferences, module switches, legacy JSON import, JSON export, delete planner data                            |
| `GET /api/export/json`          | Download every planner row for the signed-in user                                                                      |

## Scripts

| Script                                                        | What it does                                              |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                                                 | Dev server with Turbopack                                 |
| `npm run build` / `npm start`                                 | Production build and server                               |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | What CI runs                                              |
| `npm test`                                                    | Vitest unit tests                                         |
| `npm run e2e`                                                 | Playwright (needs `npx playwright install chromium` once) |
| `npm run db:generate`                                         | Generate a SQL migration from the schema                  |
| `npm run db:migrate`                                          | Apply migrations (uses `DIRECT_URL`)                      |
| `npm run db:push:dev`                                         | Push the schema straight to the dev project               |
| `npm run db:seed`                                             | Seed sample data for `SEED_USER_ID`                       |

## Deployment

Vercel, `dev` branch to a preview environment on the dev Supabase project, `main` to production behind Cloudflare. Set every variable from `.env.example` in Vercel. Sentry reports errors in production when `NEXT_PUBLIC_SENTRY_DSN` is set.

## Docs

- `docs/architecture.md`: layers, folders, request flow.
- `docs/schema.md`: database conventions and relationship diagram.
- `docs/decisions/`: why things are the way they are.
- `legacy/`: the previous vanilla JS app, kept as a reference until its data is imported in Release 1.
