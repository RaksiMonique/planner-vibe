# 0003: The vanilla JS app is a reference and data source, not the base

Date: 2026-11-07

## Context

The repository held a working single-page planner (vanilla JS, Bootstrap 5, localStorage) with a half-finished module refactor on the `dev-modules` branch.

## Decision

The old app moved to `legacy/` untouched. The module refactor is abandoned. Release 1 includes an importer for the app's JSON export so no data is lost. The folder is deleted once imported data is verified.

## Consequences

The new build starts clean on the chosen stack. The old app stays available for comparing features and for exporting data until Release 1 ships.
