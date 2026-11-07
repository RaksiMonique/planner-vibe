# 0001: Stack and engineering conventions

Date: 2026-11-07

## Context

The owner already runs another application, for a different company, on Next.js 16, Supabase, Drizzle, Tailwind 4 and shadcn/ui, with working auth wiring, RLS policies, typed env, git hooks and CI.

## Decision

The planner uses the same stack and the same conventions: proxy-based session refresh, `src/lib/supabase` clients, `pgPolicy()` RLS on every table, `@t3-oss/env-nextjs`, the npm-audit pre-push hook and the secret-scanning pre-commit hook. The configuration files were copied once during scaffolding; nothing else is shared (decision 0002).

Visual design is independent: the planner has its own palette and fonts.

## Consequences

Debugged wiring is reused and the owner keeps one mental model across projects. The planner adds FullCalendar, rrule, date-fns and Vitest because scheduling is its core and recurrence logic deserves unit tests.
