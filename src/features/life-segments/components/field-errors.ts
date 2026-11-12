import type { ActionResult } from '@/lib/action-result';

/** Per-field messages from an ActionResult, shaped for `FieldError`. */
export function fieldErrors(
  state: ActionResult<unknown> | null,
  name: string
): Array<{ message?: string }> | undefined {
  if (!state || state.ok) return undefined;
  const messages = state.fieldErrors?.[name];
  return messages?.map((message) => ({ message }));
}

export function hasFieldError(state: ActionResult<unknown> | null, name: string): boolean {
  return !!fieldErrors(state, name)?.length;
}
