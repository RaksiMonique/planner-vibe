# 0004: "Delete my data" deletes planner data, never the login

Date: 2026-11-07

## Context

The spec (Phase 6) asks for account deletion. The data-only deletion was designed when sharing an auth user pool with another application was still being considered; it is safe in every environment, including a local stack that holds other test users.

## Decision

The planner offers "Delete all planner data": it deletes the user's `planner.profiles` row, which cascades through every planner table, then recreates an empty profile and preferences. The auth user is untouched.

## Consequences

The planner's settings page says this explicitly. Since the planner's Supabase projects are its own (decision 0002), a true account deletion that also removes the auth user can be added later for production.
