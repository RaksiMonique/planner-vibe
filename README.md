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

| Route                                                                             | What it does                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`                                                                      | Today and this week: priorities, due and overdue tasks, weekly strip, goals, appointments, Inbox, quick capture                                                                                                                                                                       |
| `/tasks`                                                                          | List, board and Eisenhower matrix views, task sheet with subtasks and recurrence that can create a segment, project or goal in place, filters by segment, project and goal; pickers list the most used first; a task can wait on other tasks and shows as blocked until they are done |
| `/goals`, `/goals/[id]`                                                           | Goals by horizon with the parent chain, milestones, computed progress and linked projects; the goal form ticks the projects that support it, and a new project can start already linked                                                                                               |
| `/projects`, `/projects/[id]`                                                     | Project workspaces with tasks, milestones and linked goals, including a new goal created already linked                                                                                                                                                                               |
| `/segments`, `/segments/[slug]`                                                   | Life Segments with per-segment goals, projects and tasks                                                                                                                                                                                                                              |
| `/calendar`                                                                       | Month, week, day and list views of events, task due dates and milestones; drag to reschedule; events take a built-in category or one of your own, managed in Settings                                                                                                                 |
| `/settings`, `/settings/data`                                                     | Profile, preferences, module switches, legacy JSON import, JSON export of every table, import of a planner export from another project, delete planner data                                                                                                                           |
| `GET /api/export/json`                                                            | Download every planner row for the signed-in user                                                                                                                                                                                                                                     |
| `/week`                                                                           | The week at a glance: priorities, goals in play, and per day events, time blocks, tasks, milestones, routines and habits with toggles                                                                                                                                                 |
| `/month`                                                                          | Month grid with per-day counts, monthly goals, milestones, tasks by week and a habit summary                                                                                                                                                                                          |
| `/habits`                                                                         | Habits with streaks, a 7-day toggle row, a monthly calendar and archive                                                                                                                                                                                                               |
| `/routines`                                                                       | Morning, evening and custom routines with step checklists, weekday schedules, templates and history                                                                                                                                                                                   |
| `/time`                                                                           | Weekly and daily time blocking with presets, templates, drag and resize, sticky notes, logged time and a planned-versus-actual analysis                                                                                                                                               |
| `/notifications`                                                                  | In-app reminders for tasks, events and habits; the bell in the header shows unread ones                                                                                                                                                                                               |
| `/bible`, `/bible/[id]`                                                           | Reading plans with today's chapters and a queue (a plan can start the day the one before it is finished), devotionals, studies with notes and references, favourite verses                                                                                                            |
| `/prayer`                                                                         | Prayer intentions with answered toggles and a prayer journal                                                                                                                                                                                                                          |
| `/study`, `/study/courses/[id]`                                                   | Subjects, courses with lessons and progress, assignments mirrored as tasks, notes, resources, Pomodoro sessions logged as time                                                                                                                                                        |
| `/media/reading`, `/media`                                                        | Reading list by status with logs and lists; all media kinds in one table                                                                                                                                                                                                              |
| `/journal`                                                                        | Daily journal and gratitude by date with an optional mood                                                                                                                                                                                                                             |
| `/reviews`, `/reviews/[id]`                                                       | Weekly reset, monthly, quarterly, annual and goal reviews with prompts and prefilled stats                                                                                                                                                                                            |
| `/notes`, `/notes/quotes`                                                         | Notes and quotes by segment; quotes feed the dashboard inspiration card                                                                                                                                                                                                               |
| `/wellness/mood`, `/wellness/self-care`, `/wellness/fitness`, `/wellness/journal` | Mood and energy trends, skincare and haircare, treatments, products, fitness, sleep and water logs, wellness journal, optional cycle tracking                                                                                                                                         |
| `/meals`, `/meals/recipes`, `/groceries`                                          | Recipes with scaling, a weekly meal planner with templates, grocery lists generated from the plan with consolidated quantities and a print view                                                                                                                                       |
| `/gifts`                                                                          | Recipients, gifts by occasion with budgets and status, and a wishlist                                                                                                                                                                                                                 |
| `/vision-boards`                                                                  | Boards of uploaded images, quotes and links linked to goals and projects                                                                                                                                                                                                              |
| `/media`                                                                          | Books, movies, series and songs in gallery, table and list views with logs and custom lists                                                                                                                                                                                           |
| `/important`                                                                      | Emergency contacts, important dates, insurance, medical and household records, kept out of exports by default                                                                                                                                                                         |
| `/quarter`, `/year`, `/lifelong`                                                  | Quarterly objectives with month-by-month breakdown and retrospective; annual objectives, year at a glance and quarterly breakdown; lifelong aspirations with next steps, milestone timeline and horizons                                                                              |
| `/goals/[id]/mandala`                                                             | Mandala view: the goal in the middle, up to eight supporting goals around it, each opening its own grid; goal and segment pages show every horizon on one timeline                                                                                                                    |
| `/work/calendar`, `/work/projects`                                                | Job calendar: rotating shift patterns, one-off, multi-day and repeating shifts of built-in kinds or your own, leave and public holidays with availability derived from them, work appointments, shifts shown in the Life Calendar; projects in the Career & Work segment              |
| `/finance`                                                                        | Financial snapshot: financial goals with progress updates, budgets at a glance with recorded spending, upcoming financial actions; all entered by hand                                                                                                                                |
| `/time/analytics`                                                                 | Planned versus logged time by segment, project, activity type and day, with top tasks, for a week or month                                                                                                                                                                            |
| `/settings/integrations`                                                          | Calendar subscription (ICS) address, email and push reminder channels, Google Calendar connection                                                                                                                                                                                     |
| Search (Ctrl or Cmd + K, or the magnifying glass)                                 | Full-text search across tasks, goals, projects, events, notes, journal, habits, routines, recipes, media, studies, prayer, courses, gifts, boards and more; page shortcuts; quick capture to the Inbox                                                                                |
| `/settings` (Dashboard section)                                                   | Reorder and hide dashboard cards; cards of switched-off modules stay hidden                                                                                                                                                                                                           |
| `/analytics`                                                                      | Goal completion, habit consistency, time allocation, projects and milestones, mood and energy trends, period summary and life balance, by month, quarter or year                                                                                                                      |
| `GET /api/calendar/feed.ics?token=…`, `GET /api/export/csv?entity=…`              | Read-only calendar subscription; one table as CSV                                                                                                                                                                                                                                     |
| `GET /api/cron/daily`, `GET /api/cron/reminders`                                  | Scheduled jobs (bearer `CRON_SECRET`): due reminders to app, email and push; the daily digest; pruning; Google sync                                                                                                                                                                   |
| `GET /api/google/connect`, `GET /api/google/callback`, `POST /api/push/subscribe` | Google Calendar OAuth start and return; browser push subscription for this device                                                                                                                                                                                                     |

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
| `npm run db:migrate:dev`                                      | Apply pending migrations to the dev project (never push)  |
| `npm run db:seed`                                             | Seed sample data for `SEED_USER_ID`                       |

## Deployment

Vercel, with `master` deployed to production behind Cloudflare and every pull request to a preview environment. Set every variable from `.env.example` in Vercel. Sentry reports errors in production when `NEXT_PUBLIC_SENTRY_DSN` is set.

## Backups

The Supabase Free plan has no managed backups, so `.github/workflows/backup.yml` dumps the `planner` schema every Monday and keeps it as a private workflow artifact for 90 days. Enable it with the repository secret `PRODUCTION_DIRECT_URL` (the production project's direct connection string) and the repository variable `BACKUPS_ENABLED` set to `true`, then run it once by hand to test. Restore with `pg_restore --no-owner --schema=planner -d <direct url> <dump file>`.

## Docs

- `docs/architecture.md`: layers, folders, request flow.
- `docs/schema.md`: database conventions and relationship diagram.
- `docs/decisions/`: why things are the way they are.
- The previous vanilla JS app is archived outside this repository in `../planner-site-legacy` (git tag `legacy-vanilla-app`); open its `index.html` to export your data, then import it under Settings, then Data.

## Integrations (Release 6)

Every integration is optional and switches itself on when its keys are present (see `.env.example`).

- **Print and PDF**: no setup. The week, month, quarter, year and review pages, and the grocery list, have a "Print or save as PDF" button; a print stylesheet drops the navigation and keeps cards whole.
- **CSV export**: `GET /api/export/csv?entity=<table>` (add `&sensitive=1` for the private tables); `/api/export/csv` alone lists the tables.
- **Calendar subscription (ICS)**: no setup. Settings, Integrations gives a private address that Apple Calendar, Google Calendar and Outlook can subscribe to; rotate it there if it leaks.
- **Email reminders and the daily digest**: `RESEND_API_KEY` and `EMAIL_FROM` (a sender on a domain verified in Resend). Users opt in under Settings, Integrations.
- **Scheduled jobs**: `vercel.json` runs `/api/cron/daily` once a day (Vercel's free plan allows daily jobs). It keeps the database awake, prunes old notifications, sends due reminders and the digest. For reminders closer to their time, point an external scheduler at `/api/cron/reminders` every 10 to 15 minutes with the header `Authorization: Bearer <CRON_SECRET>`.
- **Google Calendar**: a Google Cloud OAuth client (Web application) with redirect URI `<NEXT_PUBLIC_SITE_URL>/api/google/callback`, the Google Calendar API enabled, and `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY` set. Planner events are written to the chosen Google calendar; that calendar's own events appear read-only in the Life Calendar.
- **Browser push**: `npx web-push generate-vapid-keys` once; set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`. Each device subscribes from Settings, Integrations.
