import { AppShell } from '@/components/layout/app-shell';
import { redirect } from 'next/navigation';
import { getAccess } from '@/features/access/service';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();
  const access = await getAccess(user.id);
  if (access.status !== 'approved') redirect('/pending');
  const prefs = await getPreferences(user.id);
  return (
    <AppShell user={{ id: user.id, email: user.email ?? '' }} enabledModules={prefs.enabledModules}>
      {children}
    </AppShell>
  );
}
