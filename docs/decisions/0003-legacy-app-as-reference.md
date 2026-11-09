# 0003: The vanilla JS app is a reference and data source, not the base

Date: 2026-11-07

## Context

The repository held a working single-page planner (vanilla JS, Bootstrap 5, localStorage) with a half-finished module refactor on the `dev-modules` branch.

## Decision

The old app moved to `legacy/` untouched while the importer was built, and on 2026-11-08 it moved out of the repository to `../planner-site-legacy` (tag `legacy-vanilla-app` marks its last commit). The module refactor is abandoned. The importer covers every section of the app's JSON export.

## Consequences

The new build starts clean on the chosen stack. The archived copy stays available for exporting data until the import has been done on the real projects.
