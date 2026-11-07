import { exportPlannerData } from '@/features/export/service';
import { requireUser } from '@/lib/auth';
import { toDateKey } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await requireUser();
  const data = await exportPlannerData(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="planner-export-${toDateKey(new Date())}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
