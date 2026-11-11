# 0007: Integrations are off until their keys exist, and each side owns its records

Date: 2026-11-11

## Context

Release 6 adds email, browser push, Google Calendar sync and scheduled jobs. Each needs an account or key the planner cannot create for itself, and the deployment must keep working without them.

## Decision

- Every integration checks its own environment variables at run time and stays off, with a plain sentence in Settings, Integrations, until they exist. Nothing fails at build or boot for a missing key.
- Scheduled work runs through route handlers guarded by `CRON_SECRET`. The one daily Vercel job does everything that must happen at least once a day; a second route exists for an external scheduler that can call more often.
- Google Calendar sync avoids conflict rules by ownership: the planner writes its events to the chosen calendar and never edits that calendar's other events; those appear read-only. A Google-side edit to a planner event is overwritten on the next push. Tokens are stored encrypted.
- The ICS feed uses a per-user token as its only credential, because calendar apps cannot sign in. Rotating the token is the revocation.

## Consequences

- A fresh deployment works with the database alone; the README lists what each extra key switches on.
- Two-way merging of edits made in Google is out of scope; the Google calendar is a mirror plus a source of read-only events.
