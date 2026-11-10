/**
 * The planner's session cookie name. Supabase derives the default from the
 * project id, and the shared development project would otherwise hand the
 * planner the other team's session on localhost (docs/decisions/0002).
 */
export const COOKIE_OPTIONS = { name: 'planner-auth' } as const;
