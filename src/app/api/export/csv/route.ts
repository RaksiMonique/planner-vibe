import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { db } from '@/db';
import { toCsv } from '@/features/export/csv';
import { EXCLUDED_FROM_EXPORT, plannerTables } from '@/features/export/tables';
import { requireUser } from '@/lib/auth';
import { toDateKey } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export/csv?entity=tasks — one table as CSV (instructions.md 9.3).
 * Private tables need `&sensitive=1`. Without an entity, lists what is available.
 */
export async function GET(request: NextRequest) {
  const user = await requireUser();
  const entity = request.nextUrl.searchParams.get('entity');
  const includeSensitive = request.nextUrl.searchParams.get('sensitive') === '1';
  const available = plannerTables().filter((t) => !EXCLUDED_FROM_EXPORT.has(t.key));
  if (!entity) {
    return Response.json({
      entities: available.map((t) => ({ key: t.key, sensitive: t.sensitive })),
    });
  }
  const table = available.find((t) => t.key === entity);
  if (!table || (table.sensitive && !includeSensitive)) {
    return Response.json({ error: `Unknown entity: ${entity}` }, { status: 404 });
  }
  const rows = (await db
    .select(table.columns)
    .from(table.table)
    .where(eq(table.userId, user.id))) as Array<Record<string, unknown>>;
  const columns = Object.keys(table.columns);
  return new Response(toCsv(rows, columns), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${table.name}-${toDateKey(new Date())}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
