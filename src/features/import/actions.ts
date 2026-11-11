'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { fail, fromError, ok, type ActionResult } from '@/lib/action-result';
import {
  importPlannerExport,
  parsePlannerExport,
  type PlannerImportSummary,
} from './planner-import';
import { importDeferred, importLegacy, type ImportSummary } from './service';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PLANNER_BYTES = 25 * 1024 * 1024;

export async function importLegacyAction(
  _prev: ActionResult<ImportSummary> | null,
  formData: FormData
): Promise<ActionResult<ImportSummary>> {
  try {
    const user = await requireUser();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0)
      return fail('Choose the JSON file exported from the old planner.');
    if (file.size > MAX_BYTES)
      return fail('That file is larger than 5 MB, which is not an export from the old planner.');
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      return fail('That file is not valid JSON.');
    }
    const summary = await importLegacy(user.id, raw, file.name);
    refreshAll();
    return ok(summary);
  } catch (e) {
    return fromError(e);
  }
}

function refreshAll() {
  for (const path of [
    '/dashboard',
    '/tasks',
    '/goals',
    '/habits',
    '/routines',
    '/segments',
    '/calendar',
    '/bible',
    '/study',
    '/journal',
    '/notes',
    '/notes/quotes',
    '/meals',
    '/meals/recipes',
    '/groceries',
    '/settings/data',
  ]) {
    revalidatePath(path);
  }
}

/** Imports Bible studies, studies, journal entries, quotes, recipes and meal plans from the latest stored export. */
export async function importDeferredAction(
  _prev: ActionResult<ImportSummary> | null
): Promise<ActionResult<ImportSummary>> {
  void _prev;
  try {
    const user = await requireUser();
    const summary = await importDeferred(user.id);
    refreshAll();
    return ok(summary);
  } catch (e) {
    return fromError(e);
  }
}

/** Imports this planner's own JSON export from another project (instructions.md 9.3). */
export async function importPlannerAction(
  _prev: ActionResult<PlannerImportSummary> | null,
  formData: FormData
): Promise<ActionResult<PlannerImportSummary>> {
  try {
    const user = await requireUser();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) return fail('Choose a planner export (JSON).');
    if (file.size > MAX_PLANNER_BYTES) {
      return fail(
        'That file is larger than 25 MB. Export without the raw legacy upload, or import in parts.'
      );
    }
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      return fail('That file is not valid JSON.');
    }
    const data = parsePlannerExport(raw);
    const profile = data.profile as { id?: unknown } | null | undefined;
    if (profile && profile.id === user.id) {
      return fail(
        'This export came from this account; importing it here would duplicate everything. Use it in a different project.'
      );
    }
    const summary = await importPlannerExport(user.id, data);
    refreshAll();
    return ok(summary);
  } catch (e) {
    return fromError(e);
  }
}
