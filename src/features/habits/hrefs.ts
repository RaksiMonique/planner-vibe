/** Builds `/habits` links with only the query params that are set. Plain module so server and client code can both use it. */
export function buildHabitsHref(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const qs = p.toString();
  return qs ? `/habits?${qs}` : '/habits';
}
