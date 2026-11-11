# 0006: The shared dev project is changed only through migrations

Date: 2026-11-10

## Context

Release 5 added tables. `drizzle-kit push` against the shared development project proposed dropping the `planner` schema and its migrations journal before recreating things, because push diffs the live database against the code and the journal table is not part of the code. A terminal prompt was the only thing that stopped it. The dev project had in fact been set up with `drizzle-kit migrate` (its journal held every file), so push was never the right tool there.

## Decision

- Every environment, including the shared dev project, changes only through migration files in `drizzle/`: `npm run db:migrate` for the project `.env.local` points at, `npm run db:migrate:dev` for the dev project.
- There is no push script for the dev project. `db:push:PROD-DANGEROUS` stays for an empty project the planner owns alone, and for nothing else.
- Custom SQL (triggers, seeds, storage buckets) goes in `--custom` migration files so the journal records it too.

## Consequences

- Schema changes are reviewable as files and apply identically in Docker, dev and production.
- Drift fixed by hand on a database (as the access approval fix once was) must be followed by the matching migration file, or the next migrate run fails on an object that already exists.
- Found on 2026-11-11: `drizzle.config.dev.ts` imported the base config, which had already loaded `.env.local`, and `process.loadEnvFile` never overrides a set variable, so `db:migrate:dev` had been running against the local database while reporting success. The dev config now applies `.env.local.dev` by hand and overrides. After any migrate, check `select count(*) from planner.__drizzle_migrations` on the target before trusting the output.
