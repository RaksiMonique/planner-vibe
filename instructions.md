# Life Planner: Development Instructions

|               |                                                                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project**   | Personal Life Planner and Tracking System                                                                                                                                                                                                |
| **Type**      | Full-stack, responsive web application                                                                                                                                                                                                   |
| **Stack**     | Next.js 16 (App Router), React 19, TypeScript 5, Supabase (Postgres + Auth), Drizzle ORM, Tailwind CSS 4, shadcn/ui                                                                                                                      |
| **Approach**  | Build in releases. Every release leaves the app deployed and working. Each release starts only with the owner's approval.                                                                                                                |
| **Isolation** | The planner belongs to its own company. It shares no infrastructure, data, accounts or code with any other application; conventions from the owner's earlier project were copied once as files. It has its own visual design (2.1, 2.2). |
| **Revised**   | 2026-11-07                                                                                                                                                                                                                               |

## How to read this document

- **Phases 1 to 12** describe _what_ must exist, grouped by workstream. They are not a build sequence.
- **Build Order** (near the end) describes _when_ each part is built. Work from it.
- Phase 8 lists every module. Treat those descriptions as requirements to refine when the release that contains them starts, not as a checklist for Release 1.
- The engineering conventions (auth wiring, RLS, tooling, hooks, CI) were copied once at scaffolding time and now live in this repository; build on them here rather than consulting other projects.
- When a decision here changes, update this file and record the reason in `docs/decisions/`.

## Starting point: the existing app

The repository currently holds a working single-page app ("Second Brain Life Planner") built with vanilla JavaScript and Bootstrap 5. It has no backend. All data lives in the browser under the localStorage key `secondBrainData`, with JSON import and export. Sections: Dashboard, Calendar & Tasks, Bible Study, Habit Tracker, Study Tracker, Life Segments, Meal Planner with grocery list, Journal, Quotes.

The `dev-modules` branch contains a half-finished split of `app.js` into `state.js`, `view.js` and `actions.js`. Those files are not wired in and duplicate code that is still present in `app.js`.

Decisions:

1. The existing app is a **feature reference and a data source**, not the base of the new build. Do not continue the module refactor.
2. **Export the existing data now** (sidebar, Export Data) and keep the JSON file outside the repository. Release 1 includes an importer for this format.
3. The old files are archived outside the repository in `../planner-site-legacy` (git tag `legacy-vanilla-app`). Export data from that copy and import it under Settings, then Data.
4. Existing Life Segment names map to the new defaults: God → Faith, Finance → Finance, Health → Health & Wellness, Business → Career & Work, Leisure → Recreation.

Shape of the existing export, for the importer:

| Key              | Shape                                                                                 | Maps to                                               |
| ---------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `tasks[]`        | `{ id, title, dueDate, priority (1/3/5), segment ("" = none), recurring, completed }` | Task. Empty segment goes to the Inbox for assignment. |
| `habits[]`       | `{ name, goal (times per month), logs: [ISO date strings] }`                          | Habit + one HabitCheckIn per log date                 |
| `bibleStudies[]` | `{ id, name, type, priority, status, bible, prereqId, lastUpdate }`                   | BibleStudy (Faith)                                    |
| `studies[]`      | `{ id, title, category, deadline, progress, notes }`                                  | Course (Education & Learning)                         |
| `segments{}`     | `{ God: [{ text, done }], Finance: [...], ... }`                                      | Goal, horizon Annual, status from `done`              |
| `routines{}`     | `{ morning: [string], evening: [string] }`                                            | Routine + RoutineStep                                 |
| `recipes[]`      | `{ id, name, instructions, ingredients: [{ name, qty, unit }] }`                      | Recipe + Ingredient                                   |
| `mealPlan{}`     | `{ "YYYY-MM-DD": recipeId }`                                                          | MealPlanEntry                                         |
| `journal{}`      | `{ "YYYY-MM-DD": text }`                                                              | JournalEntry                                          |
| `quotes[]`       | `{ id, text, source, author, type }`                                                  | Note, kind quote                                      |

## Project vision

Build a comprehensive personal life management website that combines the visual elegance of Notion planner templates with the data relationships and automation of a purpose-built application.

It should help the user plan, organise, track and review every major area of life, from daily routines to lifelong goals:

- Planning across daily, weekly, monthly, quarterly, annual and lifelong horizons.
- Managing Life Segments, goals, projects, tasks and milestones.
- Tracking habits, routines, time, mood, energy and personal development.
- Managing faith, education, wellness, finances, meals, entertainment and relationships.
- Scheduling personal activities, appointments and rotating job shifts.
- Reviewing progress through dashboards, calendars, statistics and reflections.

> **Critical requirement.** Every activity record (task, habit, event, note, mood entry, time entry, journal entry, financial action and so on) belongs to exactly one Life Segment. Goals and projects are separate entities that activities can link to. Not every activity needs a project or goal. Section 5.3 lists the records that are exempt.

The app serves one person today but is modelled for multiple users from the start (every record carries `userId`), so family sharing or open sign-up can be added later without reworking the core schema.

## Phase 1: Foundations and requirements

### 1.1 Development environment

Required: VS Code, Git and GitHub, Node.js (current LTS), npm, Docker for the local Supabase stack, and a Supabase organisation of the planner's own with a production project.

Optional: a hosted dev Supabase project, Drizzle Studio or the Supabase table editor for browsing data, and an API client (Bruno or Postman).

Repository setup: `.gitignore`, `.env.example`, `README.md`, protected `main` branch, feature branches merged through pull requests so CI runs on every change.

### 1.2 Technology stack

| Layer                 | Technology                                                                 | Notes                                                                                                            |
| --------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Front end             | Next.js 16 (App Router, Turbopack, server actions), React 19, TypeScript 5 | Pin Next to 16.4.3 or later (security patch). Middleware lives in `src/proxy.ts`.                                |
| Styling               | Tailwind CSS 4, `class-variance-authority`, `clsx`, `tailwind-merge`       | Design tokens as CSS variables, see 2.1                                                                          |
| UI components         | shadcn/ui on Base UI primitives, `lucide-react` icons                      | Components are copied into the repo and themed                                                                   |
| Fonts                 | Playfair Display (headings), DM Sans (body)                                | Loaded through `next/font`                                                                                       |
| Database              | Supabase Postgres                                                          | Separate dev and prod projects                                                                                   |
| ORM                   | Drizzle ORM with the `postgres.js` driver                                  | RLS policies declared in code with `pgPolicy()`. `drizzle-kit push` for dev only, generated migrations for prod. |
| Authentication        | Supabase Auth with `@supabase/ssr`                                         | Cookie sessions, refreshed in `src/proxy.ts`                                                                     |
| Forms and validation  | Zod 4 and react-hook-form                                                  | One Zod schema per entity, shared by client and server                                                           |
| Money                 | `decimal.js`                                                               | Only the financial snapshot and product prices need it                                                           |
| Recurrence            | `rrule`                                                                    | RFC 5545 rules, see 5.4                                                                                          |
| Dates                 | `date-fns` and `date-fns-tz`                                               | Never hand-roll date maths                                                                                       |
| Calendar UI           | FullCalendar (React)                                                       | Day, week, month, list views, drag and drop. Planner-specific.                                                   |
| Charts                | Recharts                                                                   |                                                                                                                  |
| Environment variables | `@t3-oss/env-nextjs`                                                       | Typed and validated at build time                                                                                |
| Email                 | Resend                                                                     | Reminders, magic links                                                                                           |
| Errors and analytics  | Sentry; Vercel Analytics and PostHog optional                              | Sentry from the first deployment                                                                                 |
| Rate limiting         | Upstash Redis                                                              | Only when needed, see 11.2                                                                                       |
| Testing               | Vitest, Testing Library, Playwright                                        | Vitest is added for the date and recurrence logic                                                                |
| Lint and format       | ESLint 9, Prettier with the Tailwind plugin                                | Git hooks for npm audit on push and secret scanning                                                              |
| Hosting               | Vercel behind Cloudflare                                                   | `dev` branch to a preview environment on the dev Supabase project, `main` to production                          |
| CI/CD                 | GitHub Actions                                                             | Lint, type check, test, build                                                                                    |

Start with a modular monolith: one Next.js application containing UI, server actions, services and database access. Extract services only when there is a demonstrated need.

### 1.3 Application hierarchy

```
Life Planner
└── Life Segments        Faith · Finance · Family · Health & Wellness · Career & Work
                         Education & Learning · Personal Development · Lifestyle & Home
                         Relationships · Recreation
    ├── Goals            desired outcomes, at five horizons
    ├── Projects         organised bodies of work
    └── Activities and records
        Tasks · Habits · Events · Notes · Routines · Time · Reflections
```

The ten segments above are the seeded defaults. Users can create, rename, recolour, reorder and archive segments.

This shows organisational relationships, not a rigid parent-child database structure. A project can support several goals, a goal can be supported by several projects and contain several milestones, and activities can exist without a project or goal.

| Entity       | Purpose                                     | Example                                     |
| ------------ | ------------------------------------------- | ------------------------------------------- |
| Life Segment | Ongoing area of life                        | Education & Learning                        |
| Goal         | Measurable desired outcome                  | Become proficient in full-stack development |
| Project      | Defined body of work with an end            | Build the Life Planner website              |
| Milestone    | Significant checkpoint in a goal or project | Complete authentication                     |
| Task         | Actionable work item                        | Create login form                           |
| Habit        | Repeated behaviour                          | Read for 20 minutes                         |
| Routine      | Ordered collection of steps                 | Morning routine                             |
| Event        | Scheduled occurrence                        | Doctor's appointment                        |
| Tracker      | Records and measures activity               | Mood tracker                                |
| Resource     | Stored information                          | Study notes                                 |

Studying a subject is not automatically a project. A defined learning initiative with a completion outcome, such as a course or certification, may optionally be linked to one. Travel and events become projects when they need substantial planning.

### 1.4 Decisions to make before Release 1

- Supabase hosting is decided: production is the planner's own project, shared with nothing. Development uses a project shared with the other team, where the planner owns only the `planner` schema; tests run on the local Docker stack (docs/decisions/0002).
- Sign-in methods: Google and email magic links are already enabled in the shared project. Nothing to decide unless passkeys are wanted.
- The production domain, for example a subdomain of the company's domain.
- The accent colour assigned to each default Life Segment (2.1).
- Default week start day and time zone (both live in preferences, but choose the defaults).

## Phase 2: UI/UX and component design

### 2.1 Colour palette

These are the approved theme values. Do not substitute different colours without permission. Centralise them as CSS variables consumed by Tailwind theme tokens. Components never use raw hex values.

| Name          | Hex       | Purpose                                     |
| ------------- | --------- | ------------------------------------------- |
| Deep Burgundy | `#722F37` | Primary accent, headings, active navigation |
| Terracotta    | `#B65C45` | Buttons, highlights, progress indicators    |
| Muted Coral   | `#D98576` | Secondary accents, tags                     |
| Soft Peach    | `#E8B4A2` | Decorative elements, cards                  |
| Warm Blush    | `#F5E6DC` | Highlighted sections                        |
| Warm Ivory    | `#FAF7F2` | Main application background                 |
| Warm Beige    | `#D8C8B8` | Borders, secondary backgrounds              |
| Muted Sage    | `#8B9278` | Wellness, habits, natural accents           |
| Dark Charcoal | `#35312F` | Primary text                                |
| Warm Grey     | `#80766F` | Secondary text                              |
| Pure White    | `#FFFFFF` | Cards and content surfaces                  |

Usage rules:

- Warm Ivory is the main background, Pure White is the surface for primary content cards, and Deep Burgundy is the dominant accent.
- Use Terracotta, Coral, Peach, Beige and Sage selectively. Avoid heavy saturation, gradients and large coloured backgrounds.
- Each Life Segment is assigned one accent (Burgundy, Terracotta, Coral, Peach, Sage or Beige) and uses it everywhere it appears. With ten default segments some share a colour and are told apart by icon. Users can change the assignment.
- Dark mode is out of scope until dark variants of this palette are approved.

Contrast, measured as WCAG 2 ratios, so text stays readable without leaving the palette:

- Charcoal on Ivory, White, Blush, Peach or Beige passes AA for all text sizes.
- Burgundy on Ivory, White, Blush or Peach passes AA, and White on Burgundy passes AA. Burgundy is safe for text, links and filled buttons.
- White on Terracotta passes AA (4.56), so filled Terracotta buttons use white text. Terracotta as text passes AA on White only; on Ivory it is for large text (18 px and up) only.
- Warm Grey on Ivory (4.15) and on White (4.43) is below AA for body-size text. Use it only for text 18 px and larger, captions and placeholders, or ask for an approved darker variant for small secondary text.
- Coral and Sage fail as text on light backgrounds, and white text fails on both. Use them as fills, tags, chips and indicators with Charcoal text (Coral passes AA; Sage is large text only), or as decoration.

### 2.2 Typography and visual design

- Playfair Display for major headings and editorial titles. DM Sans for navigation, body text, forms, buttons and data.
- Elegant, spacious layouts with generous whitespace and one consistent spacing scale.
- Rounded cards with subtle shadows and soft borders.
- Carefully selected photography, cover images and vision-board galleries where they add meaning.
- Consistent icons (lucide) and a clear visual hierarchy.
- Tables, calendars, cards, checklists and progress indicators as the main building blocks.
- Warm, sophisticated, Notion-inspired. The result must read as a premium digital life planner, not a corporate productivity dashboard.
- Reference images live in `docs/design-references/` and are inspiration, not templates to copy.
- Responsive desktop, tablet and mobile layouts (3.3).

### 2.3 Primary navigation

| Group                  | Pages                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Dashboard              | Today, This Week, Monthly Overview                                                 |
| Planning               | Calendar, Time Blocking, Routines, Tasks (list, board, Eisenhower matrix)          |
| Life Segments          | Segment Overview, Goals (timelines, Mandala view), Projects                        |
| Faith and Learning     | Bible Study, Prayer, Study Planner, Reading                                        |
| Wellness               | Habits, Mood and Energy, Self-Care, Fitness, Wellness Journal                      |
| Lifestyle              | Meals, Groceries, Media (Reading, Movies and Series, Songs), Gifts, Vision Boards  |
| Work                   | Job Calendar, Work Projects                                                        |
| Reviews and Reflection | Journal, Gratitude, Weekly, Monthly, Quarterly, Annual                             |
| Resources              | Notes, Quotes, Important Information                                               |
| Settings               | Profile, Preferences, Modules, Integrations, Data (import, export, delete account) |

Modules can be switched off in Settings. A disabled module disappears from navigation and the dashboard. Its data is kept.

### 2.4 Reusable components

Build on shadcn/ui: cards, buttons, checkboxes, forms, dialogs and side sheets, navigation and breadcrumbs, progress bars, tabs, tables, calendars, date pickers, filters, galleries, drag-and-drop lists, empty states, toasts.

Every component supports loading, empty, error and success states, keyboard navigation and accessible labels.

## Phase 3: Front-end architecture

### 3.1 Project structure

```
.
├── drizzle/                generated SQL migrations
├── drizzle.config.ts
├── docs/                   architecture, decisions/, design-references/
├── public/
├── e2e/                    Playwright tests
└── src/
    ├── proxy.ts            middleware: session refresh and route protection
    ├── env.ts              typed environment variables (@t3-oss/env-nextjs)
    ├── app/
    │   ├── (auth)/         sign-in, auth callback, error pages
    │   ├── (app)/          every authenticated page, inside the shell layout
    │   └── api/            route handlers: integrations, exports, feeds, cron
    ├── components/
    │   ├── ui/             shadcn/ui primitives
    │   ├── layout/         shell, sidebar, header, mobile nav
    │   └── shared/         cross-feature widgets: segment badge, date picker, empty state
    ├── db/
    │   ├── schema/         one file per domain, including pgPolicy() RLS declarations
    │   ├── index.ts        Drizzle client and the RLS-aware query helper
    │   └── seed.ts
    ├── features/           one folder per domain, see below
    ├── lib/                supabase clients, dates, recurrence, errors
    ├── hooks/
    ├── types/
    └── test/               shared test utilities and factories
```

Every feature folder has the same shape:

```
features/tasks/
├── schema.ts        Zod schemas: create, update, filters
├── service.ts       business logic and Drizzle queries, takes userId explicitly
├── actions.ts       server actions: auth check, validate, call service, revalidate
├── queries.ts       read functions used by server components
└── components/      feature UI
```

Features: life-segments, goals, projects, tasks, calendar, time, routines, habits, faith, study, wellness, journal, reviews, meals, media, gifts, vision-boards, notes, important-info, finance, work, capture, settings.

### 3.2 State management

- Server components fetch data. Server actions mutate it and call `revalidatePath` or `revalidateTag`.
- React state for local interface interaction: open dialogs, drag state, transient filters.
- Shareable view state (selected date, filters, view mode) lives in the URL search params.
- Add a client-state library only when a concrete need appears, not up front.
- Every mutation is validated server-side with the feature's Zod schema. Browser storage holds only harmless conveniences such as a collapsed sidebar or the last tab.

### 3.3 Responsive layouts

Design desktop and mobile together from the first screen.

- Desktop: spacious dashboards, multi-column layouts, detailed calendars, side panels for editing.
- Mobile: quick capture, Today view, checklists, focused single-column views, bottom navigation.
- Check every page at 360, 768 and 1280 pixels wide before calling it done.

## Phase 4: Back-end architecture

### 4.1 Service layer

- Server actions handle in-app mutations. Route handlers serve external clients: calendar feeds, exports, webhooks, a future mobile app.
- Presentation, business logic and database access are separate layers: components, then actions and queries, then services, then Drizzle.
- Every service function takes the authenticated `userId` and scopes every query by it. No service function ever queries without a user scope.
- RLS is the second line of defence. Every table declares `pgPolicy()` rules in the schema, and queries run through the RLS-aware helper that sets the Supabase role and JWT claims. The explicit `userId` filter stays regardless.
- Errors: throw typed application errors (`NotFound`, `Forbidden`, `Validation`) and map them to one consistent shape at the action or route boundary.
- Lists are paginated (cursor-based) and filterable from the start.
- `createdAt` and `updatedAt` on every table now. A full audit log is deferred until there is a reason for it.

### 4.2 API surface

Server actions cover the application itself. Route handlers exist for:

```
GET    /api/calendar/feed.ics?token=…    ICS subscription feed (Release 6)
GET    /api/export/json                  full data export
GET    /api/export/csv?entity=tasks      per-entity CSV export
POST   /api/import/legacy                import of the old app's JSON (Release 1)
GET    /api/cron/reminders               Vercel Cron, processes due reminders (Release 6)
```

If a public REST API is needed later (mobile app, integrations), expose it over the same services:

```
GET/POST   /api/life-segments
GET/POST   /api/goals            PATCH /api/goals/:id
GET/POST   /api/projects
GET/POST   /api/tasks            PATCH /api/tasks/:id
GET/POST   /api/habits           POST  /api/habits/:id/check-ins
GET/POST   /api/calendar/events
```

Use consistent validation, authentication, error handling, pagination and filtering throughout.

## Phase 5: Database design and modelling

### 5.1 Models

| Category     | Models                                                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity     | Supabase `auth.users` (managed), Profile, UserPreferences (time zone, week start, enabled modules, meal preferences)                                                              |
| Organisation | LifeSegment, Tag, TagAssignment                                                                                                                                                   |
| Planning     | Goal, GoalProject (join), Project, Milestone, Task, TaskDependency                                                                                                                |
| Scheduling   | Calendar, Event, TimeBlock, TimeBlockTemplate                                                                                                                                     |
| Tracking     | Habit, HabitCheckIn, Routine, RoutineStep (optional `habitId`), RoutineCompletion, MoodEntry, TimeEntry                                                                           |
| Reflection   | JournalEntry (kind: daily, gratitude, wellness), Review (kind: weekly, monthly, quarterly, annual, goal)                                                                          |
| Faith        | BibleBook (seed data), BibleStudy, ReadingPlan, ReadingProgress, ScriptureReference (bookmark and favourite flags), PrayerEntry (kind: intention, journal), DevotionalEntry       |
| Learning     | Subject, Course, Lesson, StudySession, StudyNote, Assignment, LearningResource                                                                                                    |
| Wellness     | WellnessEntry (kind: sleep, water, skincare, haircare, treatment, fitness, self-care, cycle), Product (inventory, favourite, wishlist with price)                                 |
| Lifestyle    | MediaItem (book, movie, series, song), MediaLog, MediaList, GiftRecipient, Gift, WishlistItem                                                                                     |
| Food         | Recipe, Ingredient, MealTemplate, MealPlan, MealPlanEntry, GroceryList, GroceryItem                                                                                               |
| Inspiration  | VisionBoard, VisionBoardItem (kind: image, quote, link)                                                                                                                           |
| Finance      | FinancialGoal, FinancialAction                                                                                                                                                    |
| Work         | ShiftPattern, Shift, LeaveEntry                                                                                                                                                   |
| Resources    | Note (kind: note, quote), ImportantRecord (kind: emergency contact, important date, insurance, medical contact, household, document reference, emergency instruction), Attachment |
| System       | Capture (the Inbox; also sticky notes when pinned to a date), Reminder, Notification                                                                                              |

Recurrence is a set of columns on Event, Task, Habit, Routine and TimeBlock (5.4), not a separate table, unless rules turn out to need sharing. Availability for the job calendar is derived from shifts and leave, not stored.

### 5.2 Conventions

- Primary keys are `uuid` (`gen_random_uuid()`), matching `auth.users`. Every table has `userId` referencing `auth.users(id)`, `createdAt`, `updatedAt`, a composite index on `(userId, …)` for its common queries, and RLS policies declared with `pgPolicy()`.
- Soft deletion with `deletedAt` on user-facing content. Hard delete only on account deletion.
- Enums for status, priority, horizon, kind, media type and similar. Never free-text status.
- Money as `numeric(14,2)` with `decimal.js` for arithmetic. Durations as integer minutes.

### 5.3 Life Segment rules

- `lifeSegmentId` is required (non-null foreign key) on Goal, Project, Task, Event, TimeBlock, TimeEntry, Habit, Routine, MoodEntry, WellnessEntry, JournalEntry, Review, Note, BibleStudy, PrayerEntry, DevotionalEntry, Subject, Course, StudySession, MediaLog, Gift, VisionBoard, MealPlan, FinancialGoal, FinancialAction and Shift.
- Exempt, because they are library or reference records: Profile, UserPreferences, LifeSegment, Tag, Calendar, BibleBook, ScriptureReference, Recipe, Ingredient, MealTemplate, GroceryList, GroceryItem, MediaItem, MediaList, GiftRecipient, Product, TimeBlockTemplate, ImportantRecord, Attachment, Reminder, Notification, Capture.
- Child records (Milestone, RoutineStep, RoutineCompletion, HabitCheckIn, ReadingProgress, Lesson, Assignment, LearningResource, VisionBoardItem, MealPlanEntry) inherit the segment from their parent.
- Users can create, rename, recolour, reorder and archive segments. Archiving hides a segment. Deleting one requires moving its records first.
- Each segment has a `weight` used by analytics, so segments are not treated as equally important by default.
- `goalId` and `projectId` are nullable on activity records. Project to Goal is many-to-many through GoalProject.
- Every query that touches a related record checks that the related record belongs to the same user.

### 5.4 Historical accuracy, recurrence and time

**Definitions versus occurrences.** A Habit describes what should happen; a HabitCheckIn records what happened on a date. A Routine describes the steps; a RoutineCompletion records one day's run. A TimeBlock is planned time; a TimeEntry is actual time. Never overwrite a definition to record history.

**Recurrence.** Store an RFC 5545 rule string, a `dtstart`, an optional `until` or `count`, a list of excluded dates, and per-occurrence overrides (a row referencing the parent plus an `occurrenceDate`). Expand occurrences on read for the requested date range with the `rrule` library. Never pre-generate unbounded occurrences. Materialise an occurrence row only when it is completed, edited or moved.

**Time.** Store instants as `timestamptz` (UTC). Store date-only facts (habit check-ins, journal days, meal plan days, all-day events) as `date`, interpreted in the user's time zone. Keep the user's IANA time zone and week start day in UserPreferences and compute "today" server-side with them.

**Migrations.** `drizzle-kit push` against the dev project only. Production changes go through generated SQL migrations committed to `drizzle/` and applied in CI. Never edit an applied migration. The seed script creates the ten default Life Segments, the 73 Bible books with chapter counts, the review templates, and development sample data.

### 5.5 Planning model details

- **Goal**: `horizon` enum (LIFELONG, ANNUAL, QUARTERLY, MONTHLY, WEEKLY), `parentGoalId` (self relation, must point to a longer horizon), `targetDate`, optional measurable fields (`targetValue`, `currentValue`, `unit`), `status`, and `progress` computed from children, milestones or measurable fields. Breaking a goal down creates child goals. It never copies the parent. Goals link to Reviews (goal reviews), to VisionBoards and VisionBoardItems, and to Tasks (daily action steps).
- **Project**: segment, status, dates, linked goals, milestones, tasks, notes, attachments, computed progress.
- **Task**: `parentTaskId` for subtasks, TaskDependency for blocking, `priority`, `isImportant` (Eisenhower importance; urgency is derived from the due date), `dueDate`, `completedAt`, recurrence columns, optional `projectId`, `goalId` and `milestoneId`. A task scheduled into a time block keeps its segment, project and goal.
- **Event**: `calendarId` (personal, work, others), start and end instants or an all-day date, recurrence, reminders, optional task link, a `category` for appointments such as self-care or work.
- **Routine**: `kind` (morning, evening, custom, skincare, haircare), `daysOfWeek` so different days can run different routines, ordered steps, each step optionally linked to a Habit.
- **TimeBlock**: `activityType` (deep work, light work, break, custom) with its colour, duration from the presets (15 and 30 minutes, 1, 2 and 3 hours) or custom, recurrence, optional task, project and segment. TimeBlockTemplate stores a reusable day or week of blocks.

## Phase 6: Authentication and user management

Supabase Auth through `@supabase/ssr`: browser, server and middleware clients in `src/lib/supabase/`, sessions in cookies, refreshed in `src/proxy.ts`.

**Recommendation:** enable Google sign-in as the primary method and email magic links (sent through Resend) as the fallback. No passwords are stored and there is no reset flow to build. New sign-ins wait on a holding page until the owner approves them under Settings, then Members; `AUTH_ALLOWED_EMAILS` auto-approves listed addresses (docs/decisions/0005).

Requirements:

- Protected application routes. `src/proxy.ts` redirects unauthenticated users to sign-in.
- User-specific data isolation enforced twice: explicit `userId` scoping in services and RLS policies in the database.
- A Profile row created for each auth user on first sign-in (database trigger or the auth callback route).
- Profile and preference management: name, time zone, week start, enabled modules, segment colours, meal preferences.
- Full data export, and "delete all planner data" (every planner row for the user). The auth user itself is never deleted here (docs/decisions/0004).
- Optional Apple sign-in later.

Security: server-side authorisation on every action and route, CSRF protection (built into server actions; add it for route handlers that mutate), the service role key used only in server code that must bypass RLS (account deletion, cron jobs), and Upstash rate limiting on sign-in and any public route handler once sign-up opens. Never send the service role key or other secrets to the client.

## Phase 7: Core planning systems

Build these before the specialised trackers.

### 7.1 Life Segments

Each segment has a dedicated page showing its goals, projects, tasks, habits, routines, events, notes, resources, progress and a timeline. Users can create, rename, recolour, archive and customise segments (2.3, 5.3).

### 7.2 Connected goals and milestones

Five horizons: lifelong, annual, quarterly, monthly, weekly. Below them sit daily action steps, which are Tasks linked to a goal, not a sixth horizon. Goals connect across periods through `parentGoalId`, for example:

```
Lifelong    Financial independence
  Annual      Increase investment assets
    Quarterly   Reach savings milestone
      Monthly     Invest target amount
        Weekly      Review investments (task: daily or weekly action step)
```

Progress rolls up through related goals without duplicating records (5.5). Each goal has target dates, measurable outcomes, progress bars, milestones, status, goal reviews, relationships to other goals and projects, and vision board associations. Goal timelines show every horizon on one axis. An optional Mandala-style view shows a central goal surrounded by up to eight supporting goals in a 3 by 3 grid, each cell expandable to its own grid. It is a view over the same parent and child relationships and needs no new model.

### 7.3 Projects and tasks

Each project has a workspace: overview, tasks, milestones, deadlines, notes, attachments, progress. Tasks support subtasks, priorities, dependencies, recurrence, due dates, and list, board and calendar views. Include an Eisenhower Matrix view (urgent by important).

### 7.4 Master calendar

Day, week, month and agenda views; personal and work events; tasks and deadlines; time blocks; recurring activities; reminders; filtering by calendar, segment and type. One data source feeds every view.

### 7.5 Main dashboard

The dashboard prioritises today and the current week. It is a composition of large and small cards, every one of them reading live from the underlying modules and linking to the full module page. It must not become a collection of unrelated widgets: everything on it answers "what needs attention now".

Large cards: personalised greeting with the date; weekly schedule and calendar; today's priorities; weekly progress summary.

Small cards: tasks due this week; overdue tasks; morning and evening routines; daily habit checklist; mood and energy check-in; active goals and milestones; upcoming appointments; job schedule preview; Bible study and devotional preview; quick notes and reminders (the Inbox); Life Segment navigation cards; optional vision board or inspirational image.

Quick actions: add task, note, event, habit check-in, time entry, and the quick-capture box. Cards for disabled modules are hidden. Customisable layouts (reorder and hide cards) arrive in Release 6.

### 7.6 Quick capture, the Inbox and sticky notes

Quick capture creates a Capture row (text, optional type) from anywhere with one shortcut. Captures appear in an Inbox on the dashboard and are converted into a Task, Note or Event by choosing a Life Segment. Nothing leaves the Inbox without a segment, which satisfies the critical requirement without slowing capture down. A Capture pinned to a date is a digital sticky note and is shown on that day in the time-blocking view, from where it can be converted with one click.

### 7.7 Shared systems and integration checks

Tasks, events, notes, reminders, calendars, time entries and Life Segments are single systems used by every module. No module gets its own implementation of any of them. The following must hold and are covered by tests:

- A habit created in Wellness appears in the daily and weekly views and in the dashboard checklist.
- A study session appears on the calendar and counts in time tracking.
- A project task appears in the weekly planner.
- A goal milestone appears on the goal timeline and on the calendar.
- A recipe selected for a meal plan contributes its ingredients to the grocery list.
- A work shift appears in the Life Calendar when the Work module is enabled and the work calendar filter is on.
- A routine step linked to a habit records the habit check-in when the step is completed.
- A task scheduled into a time block keeps its Life Segment and project.
- The dashboard displays information from the modules and never keeps duplicate records.

## Phase 8: Specialised feature modules

Twenty-three modules. Every tracker (habits, mood, energy, time, Bible study, study sessions, wellness, reading, movies, songs, self-care, meal planning, goal progress) has its own dedicated page, never only a dashboard widget. Where relevant a tracker page offers daily, weekly and monthly views, historical records, filters, statistics, progress visualisations, and notes or reflections. Modules 8.4 to 8.9 and 8.17 are views over the core planning data, not separate data stores. Every module can be disabled in Settings.

| #    | Module                     | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1  | Bible Study and faith      | Daily Scripture readings, reading plans with progress, Bible study notes, prayer intentions and a prayer journal, devotional tracker, Scripture bookmarks and favourite verses, spiritual reading list (books in the media tracker tagged Faith), spiritual goals (Goals in the Faith segment), faith reflections. Catholic canon (73 books, deuterocanonical books included) seeded as data. Passages are stored as book, chapter and verse ranges. Bible text is not stored in the database; when a full passage is displayed it is fetched from an appropriately licensed source and shown with attribution. |
| 8.2  | Habits                     | Custom habits with frequency targets (per day, week or month), daily check-ins, streaks, completion rates, reminders, weekly summary, monthly habit calendar, links from routine steps.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 8.3  | Study Planner              | Dedicated study workspaces with subjects, courses, lessons, study schedules (time blocks), study notes, assignments and deadlines, learning resources, study timer and Pomodoro sessions (saved as TimeEntries and shown on the calendar), study history, progress, learning goals (Goals in Education & Learning), reading lists (media tracker). A course or certification may optionally link to a project.                                                                                                                                                                                                  |
| 8.4  | Segment goal timelines     | Per-segment pages with lifelong, annual, quarterly, monthly and weekly goals on a timeline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 8.5  | Weekly view                | Tasks, priorities, scheduled activities, habits, routines, appointments and goal progress for the current week.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 8.6  | Monthly view               | Calendar, goals, milestones, tasks, habits, end-of-month review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 8.7  | Quarterly view             | Objectives, project milestones, deadlines, progress, retrospective.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 8.8  | Annual view                | Objectives, year-at-a-glance calendar, quarterly breakdown, milestones, yearly reflection.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 8.9  | Lifelong goals             | Long-term aspirations, milestone timelines, Mandala view, vision boards, links to shorter-term goals.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 8.10 | Routines                   | Separate morning and evening planners plus custom routines. Ordered steps, different routines for different days of the week, weekly schedule, daily checklist, recurrence, completion tracking and history, routine templates, steps linked to habits.                                                                                                                                                                                                                                                                                                                                                         |
| 8.11 | Media and collections      | Books, movies, television series and songs: title, cover image, category, status, start and completion dates, rating, review, notes, favourites, custom lists. Gallery, table and list views. The Reading, Movies and Series, and Songs pages are this module filtered by type.                                                                                                                                                                                                                                                                                                                                 |
| 8.12 | Gifts                      | Recipients, occasions, gift ideas, budgets, purchase status, dates, history.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 8.13 | Vision boards              | Multiple independent boards (seasonal, home renovation, lifestyle inspiration, long-term vision). Items are uploaded images, quotes or links with captions and categories. Boards and items link to goals and projects. Images go to private storage (11.2).                                                                                                                                                                                                                                                                                                                                                    |
| 8.14 | Recipes                    | Ingredients with quantities, instructions, preparation time, servings, categories, dietary tags, rating, images, notes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 8.15 | Meal planner               | Daily meals and weekly schedules from saved recipes or custom meals, reusable meal templates, meal preferences from the user's settings, linked to grocery requirements.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 8.16 | Grocery list               | Generated from the selected recipes with quantities consolidated per ingredient and unit, plus manual additions. Item categories, purchase checkboxes, store grouping, print-friendly view and PDF export.                                                                                                                                                                                                                                                                                                                                                                                                      |
| 8.17 | Life calendar              | The master calendar (7.4) as the central view of all personal activity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 8.18 | Job calendar               | Rotating shift patterns, on-call schedules, recurring shifts, work appointments, leave, public holidays, work reminders, availability derived from shifts and leave. Job events appear in the Life Calendar through the calendar filter when the Work module is enabled.                                                                                                                                                                                                                                                                                                                                        |
| 8.19 | Wellness and self-care     | Mood and energy, sleep, water intake, fitness planning, optional menstrual cycle tracking (off by default). Morning and evening skincare routines and haircare schedules (Routines of those kinds), weekly personal care treatments, self-care appointments (Events), product inventory, favourite product gallery, product wishlist with prices. Daily, weekly and monthly wellness journals. Private by default: excluded from any future sharing feature and from exports unless explicitly included.                                                                                                        |
| 8.20 | Journal and reflections    | Daily journal, gratitude journal, optional mood reflection. Structured but optional templates for the weekly reset, monthly review, quarterly review and annual review, with prompts such as: What went well? What did not go well? What did I accomplish? What needs improvement? Which goals progressed? What should I prioritise next?                                                                                                                                                                                                                                                                       |
| 8.21 | Time blocking and tracking | Weekly and daily time-blocking calendars with colour-coded activity types (deep work, light work, break, custom), preset durations of 15 and 30 minutes and 1, 2 and 3 hours plus custom, recurring blocks, reusable templates, drag-and-drop rescheduling, sticky notes (7.6), planned versus actual time, allocation by Life Segment and by project, weekly time analysis. Blocks appear in the Life Calendar. Tasks placed in blocks keep their segment and project.                                                                                                                                         |
| 8.22 | Financial snapshot         | Financial goals, savings progress, budgets at a glance, upcoming financial actions, all entered by hand in the planner. The planner never connects to any other application's data or API. Do not rebuild a budgeting system here.                                                                                                                                                                                                                                                                                                                                                                              |
| 8.23 | Important information      | A private section of structured records: emergency contacts, important dates, insurance references, medical contact information, household information, important document references, emergency instructions. Never store passwords or other credentials here; link to a password manager entry instead. Excluded from any sharing feature and from exports unless explicitly included.                                                                                                                                                                                                                        |

## Phase 9: Advanced functionality

### 9.1 Calendar integrations

Start with a read-only **ICS subscription feed** per user, with a signed token in the URL. Apple Calendar, Google Calendar and Outlook can all subscribe to it and it needs no OAuth. Google refreshes subscribed feeds only every several hours, which is acceptable for a first version. Two-way sync with Google Calendar through its API is a later, separate piece with its own conflict rules. Apple has no public calendar API, so CalDAV write access is out of scope.

### 9.2 Notifications and reminders

In-app notifications first. Then email reminders (Resend) and browser push. Reminders need a scheduler. Vercel Cron calling a route handler that processes due reminders is enough to begin with.

### 9.3 Import and export

JSON export of everything, CSV per entity, print stylesheets for planners, reviews and grocery lists, and PDF generated from those print views. Import for the legacy app's JSON (Release 1) and for the app's own JSON export.

### 9.4 Analytics and reporting

Goal completion, habit consistency and streaks, time allocation by segment and project, planned versus actual time, project and milestone progress, mood and energy trends, weekly to annual summaries, and a life balance visualisation weighted by segment weight.

### 9.5 Search

Postgres full-text search (`tsvector` columns) across the user's own records, exposed through a command palette (Ctrl or Cmd + K) that also triggers quick capture.

### 9.6 Future options

Customisable dashboard layouts beyond reorder and hide, AI-assisted planning, natural-language entry, voice capture, family collaboration, a mobile app and subscriptions are considered only after Release 6 is stable.

## Phase 10: Testing and quality

| Category       | What to verify                                                                                                                               | Tool                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Unit           | Goal progress roll-up, habit streaks, recurrence expansion, grocery quantity consolidation, date and time zone handling, Zod schemas         | Vitest                  |
| Integration    | Services against a local Supabase (CLI) or the dev project: relationships, ownership checks, RLS, soft delete, the integration checks in 7.7 | Vitest + Supabase       |
| End-to-end     | Sign-in, create task, complete habit, schedule event, quick capture to task                                                                  | Playwright              |
| Security       | Cross-user access attempts return not found, input validation, session handling                                                              | Vitest + Playwright     |
| Accessibility  | Keyboard access, labels, contrast against the palette rules in 2.1                                                                           | axe in Playwright       |
| Responsive     | 360, 768 and 1280 pixels                                                                                                                     | Playwright              |
| Performance    | Dashboard and calendar with a year of data                                                                                                   | Seeded data, Lighthouse |
| Data integrity | Recurrence, time zones, imports, deletions                                                                                                   | Vitest                  |

Minimum per release: unit tests for every calculation and date function added, one integration test per service, one end-to-end happy path per new page, and a cross-user access test for every new entity. Keep a realistic seed with both a fresh account and an account with two years of history.

## Phase 11: Deployment, operations and security

### 11.1 From Release 1

- GitHub, Vercel behind Cloudflare, Supabase dev and prod projects. The `dev` branch deploys to a preview environment on the dev Supabase project; `main` deploys to production. Previews never touch production data.
- GitHub Actions on every pull request: lint, type check, unit and integration tests, build. Playwright runs on `main`. Git hooks for npm audit on push and secret scanning.
- Security headers in `next.config`, Cloudflare in front, secrets in Vercel environment variables validated by `src/env.ts`, Dependabot for dependency updates.
- Backups: Supabase's scheduled backups plus a weekly `pg_dump` from a GitHub Action to object storage. Write the restore procedure in `docs/` and test it once before Release 2.
- Sentry from the first deployment. Vercel Analytics and PostHog if wanted.

### 11.2 When needed

- A separate staging environment, if the preview environment proves insufficient.
- Upstash Redis rate limiting on public routes, as soon as sign-up is open to anyone other than the owner.
- Supabase Storage with a private bucket, signed URLs, and type and size validation, when uploads arrive in Release 4 (vision boards, recipe images, media covers, product photos).
- Monitoring of cron jobs and integrations, once they exist in Release 6.

## Phase 12: Documentation

Keep in `docs/`: product overview and requirements (this file), architecture, database schema and relationship diagram, API contracts, component library notes including the colour tokens, auth and permissions, environment setup, deployment, testing, backup and restore, known limitations, roadmap. Record each significant decision as a short file in `docs/decisions/` with context, decision and consequences.

Review the application after each release for usability, performance, accessibility and unnecessary complexity.

## Build order

Follow dependencies. Each release ends deployed, tested and documented, and the next one starts only with the owner's approval.

| Release                            | Contents                                                                                                                                                                                                                                                                                                                                                           | Done when                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **0: Foundation design**           | Drizzle schema for Identity, Organisation, Planning, Scheduling and Tracking (reviewed, not necessarily final). Design tokens from 2.1 and the two fonts. Interactive dashboard wireframe following 7.5. Next.js 16 scaffold with Tailwind 4, shadcn/ui, Drizzle, Supabase Auth, typed env, Sentry, lint and git-hook config, CI, and a deployed placeholder page. | The scaffold is live on Vercel behind sign-in, the tokens render, and the schema has a relationship diagram in `docs/`. |
| **1: Core**                        | Life Segments with their pages, goals with the connected chain, projects, milestones, tasks (list and matrix), basic calendar with events, dashboard with quick capture and Inbox, legacy JSON importer, JSON export, planner data deletion.                                                                                                                       | The owner's real data is imported and the app replaces the old one for daily task use.                                  |
| **2: Daily planning**              | Weekly and monthly views, time blocking with presets, templates, drag and drop and sticky notes, time entries, routines with per-day schedules and habit links, habits, in-app reminders.                                                                                                                                                                          | A full week can be planned and reviewed without leaving the app.                                                        |
| **3: Personal growth**             | Bible Study with reading plans, prayer and devotionals, Study Planner with Pomodoro, journal, gratitude, review templates, and the reading list as the first slice of the media tracker.                                                                                                                                                                           | Legacy Bible studies, studies, journal and quotes are imported.                                                         |
| **4: Lifestyle**                   | Wellness with products and wellness journals, recipes, meal planner with templates, grocery list with consolidation and PDF, gifts, the rest of the media tracker, vision boards with uploads, important information.                                                                                                                                              | Legacy recipes and meal plan are imported.                                                                              |
| **5: Advanced planning**           | Quarterly, annual and lifelong views, goal timelines and the Mandala view, goal reviews, job calendar with shift patterns and availability, time analytics, financial snapshot.                                                                                                                                                                                    | All five horizons are navigable from one goal.                                                                          |
| **6: Integrations and refinement** | ICS feed, Google Calendar sync, email and push notifications, CSV and PDF export, analytics dashboard, search, customisable dashboard layout, performance pass.                                                                                                                                                                                                    | External calendars show planner events and reminders arrive by email.                                                   |

## Development rules

These apply throughout the project.

1. **Inspect before building, and get approval for each phase.** Read the existing code first, preserve working features, implement changes incrementally, and do not begin a release or any other major implementation phase without the owner's approval.
2. **Share underlying data.** Tasks, events, notes, reminders, calendars and Life Segments are single systems used by every module. Never build a module-private copy of one (7.7).
3. **Never duplicate records across views.** Daily, weekly, monthly and annual interfaces and the dashboard display the same rows.
4. **Preserve existing functionality.** New features must not break established modules or relationships. Tests guard this.
5. **Keep layers separate.** Components, actions, services, validation and database access each live in their own place (3.1).
6. **Scope every query by user.** No exceptions, including related records.
7. **Test each feature before moving on.** At least the per-release minimum in Phase 10.
8. **Reuse the design system.** Only the approved palette (2.1) and the two fonts. No one-off colours, fonts or spacing.
9. **Responsive from the first screen.** Mobile is not a final-stage enhancement.
10. **Record decisions.** Database, API and component design choices go in `docs/decisions/` with their reasons.
11. **Deploy incrementally.** Every merge to `main` is deployable.
12. **Simplest architecture that meets current requirements.** Defer the items in 11.2 and anything else the current release does not need.
13. **Keep this document current.** When the plan changes, change it here first.

## Final product objective

The finished Life Planner operates as a single connected system for organising life. A user can define a lifelong aspiration, break it into annual and quarterly goals, create supporting projects, schedule weekly tasks, track daily habits and time, and review progress, without entering the same information twice.

The interface combines the visual elegance and flexibility of the Notion references with the reliability, data relationships and automation of a purpose-built application.
