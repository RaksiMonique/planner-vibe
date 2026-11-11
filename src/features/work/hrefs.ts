/** Builds `/work/calendar` links with only the query params that are set. Plain module for server and client code. */
export function buildWorkCalendarHref(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const qs = p.toString();
  return qs ? `/work/calendar?${qs}` : '/work/calendar';
}
