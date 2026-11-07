import { AppShell } from '@/components/layout/app-shell';
import { getPreferences } from '@/features/settings/service';
import { requireUser } from '@/lib/auth';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();
  const prefs = await getPreferences(user.id);
  return (
    <AppShell user={{ email: user.email ?? '' }} enabledModules={prefs.enabledModules}>
      {children}
    </AppShell>
  );
}
