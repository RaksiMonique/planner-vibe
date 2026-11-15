# Life Planner

Personal life planner and tracking system. The product spec is [instructions.md](instructions.md); this file covers running the code.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres + Auth), Drizzle ORM, Tailwind CSS 4, shadcn/ui on Base UI. The planner shares no infrastructure with any other application (docs/decisions/0002).

## Setup

1. Node 22 (`.nvmrc`) and npm.
2. `npm install` (also points git hooks at `.githooks/`).
3. Supabase: create an organisation and a production project for the planner alone, then fill `.env.local` from its settings. For development use the local Docker stack described below, which fills `.env.local.dev`. Set `NEXT_PUBLIC_SITE_URL` and `AUTH_ALLOWED_EMAILS` in both files. See `.env.example` for which script reads which file.
4. Sign-in is email and password. In each Supabase project enable the Email provider; the login page also offers a sign-in link by email (first sign-in, or a forgotten password), which needs `http://localhost:3000/auth/callback` and the production callback URL in the project's redirect URLs. Set `AUTH_GOOGLE=true` to show the Google button once that provider is configured.
5. Apply the schema to the dev project: `npx dotenv -e .env.local.dev -- npm run db:migrate`. This creates the `planner` schema, the tables and the profile trigger, and backfills your existing user. After that, `npm run db:push:dev` works for quick iteration. Only the `planner` schema is ever touched. See `docs/schema.md`.
6. `npm run dev:dev` and open http://localhost:3000.

The public `/wireframe` page shows the dashboard with sample data and needs no Supabase configuration. Sign in at `/auth/login` to reach the real shell at `/dashboard`.

## Local Supabase for development and tests

Docker runs the whole stack locally, so development never touches a hosted project:

```
npx supabase start -x studio,imgproxy,logflare,vector,edge-runtime,realtime,storage-api,mailpit
npx supabase status -o env        # URLs and keys for .env.test.local
npx dotenv -e .env.test.local -- npm run db:migrate
npm run db:seed                   # needs SEED_USER_ID, an existing auth user
npm run e2e                       # signs in owner@planner.test through a minted magic link
LEGACY_EXPORT_FILE=~/my-export.json npm run e2e   # import test uses your real export instead of the sample
```

Tests start their own server on port 3101 with `.env.test.local`, so they never touch the server you use on 3100 or any hosted project.

## What exists (Releases 1 to 6)

| Route                           | What it does                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`                    | Today and this week: priorities, due and overdue tasks, weekly strip, goals, appointments, Inbox, quick capture                                                                                                                                                                                   |
| `/tasks`                        | List, board and matrix views (due now by important), task sheet with subtasks and recurrence that can create a segment, project or goal in place, filters by segment, project and goal; pickers list the most used first; a task can wait on other tasks and shows as blocked until they are done |
| `/goals`, `/goals/[id]`         | Goals by horizon with the parent chain, milestones, computed progress and linked projects; the goal form ticks the projects that support it, and a new project can start already linked                                                                                                           |
| `/projects`, `/projects/[id]`   | Project workspaces with tasks, milestones and linked goals, including a new goal created already linked                                                                                                                                                                                           |
| `/segments`, `/segments/[slug]` | Life Segments with per-segment goals, projects, tasks and the events of the next 14 days                                                                                                                                                                                                          |
