import type { Metadata } from 'next';
import { Dashboard } from '@/features/dashboard/components/dashboard';
import { getDashboardData } from '@/features/dashboard/queries';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, prefs] = await Promise.all([getDashboardData(user.id), getPreferences(user.id)]);
  return <Dashboard userId={user.id} data={data} timeZone={prefs.timeZone} />;
}
