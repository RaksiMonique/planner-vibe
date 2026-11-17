# Deferred fixes

Rationale for every entry in `.githooks/audit-allowlist.txt` lives here so deferrals do not rot.

## GHSA-fc5q-39xc-vjpf, picomatch ReDoS (deferred 2026-11-17)

- **What:** `picomatch` up to 4.0.7 can be made to backtrack badly by a crafted glob with repeated extglobs.
- **Where it reaches us:** only development and build tooling: vitest (via vite and tinyglobby), the Sentry build plugin (via @rollup/plugin-commonjs) and the shadcn CLI. Nothing at runtime passes user input to a glob matcher.
- **Why deferred:** no fixed release exists. 4.0.7 is the latest version and is itself in the affected range, so neither `npm audit fix` nor an override can resolve it.
- **Plan:** the allowlist carries `watch: picomatch 4.0.8`, so the pre-push hook will nudge once a newer release appears. Then add an `overrides` entry for `picomatch` (or take the tooling updates), run the unit tests and a build, and delete this entry and the allowlist line.

