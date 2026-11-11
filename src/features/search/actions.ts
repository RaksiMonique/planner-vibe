'use server';

import { requireUser } from '@/lib/auth';
import { fromError, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { searchEverything, type SearchHit } from './queries';
import { searchInput, type SearchInput } from './schema';

/**
 * Search everything the signed-in user owns. Called from the command palette
 * as the user types, so it validates and returns rather than redirecting.
 * Quick capture from the palette reuses `addCaptureAction` from the capture feature.
 */
export async function searchAction(input: SearchInput): Promise<ActionResult<SearchHit[]>> {
  try {
    const user = await requireUser();
    const parsed = searchInput.safeParse(input);
    if (!parsed.success) return fromZodError(parsed.error);
    return ok(await searchEverything(user.id, parsed.data.query, parsed.data.limit));
  } catch (e) {
    return fromError(e);
  }
}
