import type { Metadata } from 'next';
import Link from 'next/link';
import { DatabaseIcon, PlugIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { EventCategoriesList } from '@/features/calendar/components/event-categories-list';
import { listCustomCategories } from '@/features/calendar/queries';
import { ModulesForm } from '@/features/settings/components/modules-form';
import { DashboardLayoutForm } from '@/features/settings/components/dashboard-layout-form';
import { PasswordForm } from '@/features/settings/components/password-form';
import { PreferencesForm } from '@/features/settings/components/preferences-form';
import { ProfileForm } from '@/features/settings/components/profile-form';
import { getPreferences, getProfile } from '@/features/settings/service';
import { getAccess } from '@/features/access/service';
import { requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser();
  const access = await getAccess(user.id);
  const [profile, prefs, customCategories] = await Promise.all([
    getProfile(user.id),
    getPreferences(user.id),
    listCustomCategories(user.id),
  ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Profile, preferences and the modules you use."
        actions={
          <>
            {access.role === 'owner' && (
              <Link
                href="/settings/members"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Members
              </Link>
            )}
            <Link
              href="/settings/data"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <DatabaseIcon data-icon="inline-start" />
              Import, export and delete data
            </Link>
            <Link
              href="/settings/integrations"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <PlugIcon data-icon="inline-start" />
              Integrations
            </Link>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Profile</CardTitle>
            <CardDescription>The name the dashboard greets you with.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              email={profile?.email ?? user.email ?? ''}
              displayName={profile?.displayName ?? null}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Password</CardTitle>
            <CardDescription>
              Optional. With a password you can sign in without a link or Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Preferences</CardTitle>
            <CardDescription>Time zone and the first day of your week.</CardDescription>
          </CardHeader>
          <CardContent>
            <PreferencesForm timeZone={prefs.timeZone} weekStartsOn={prefs.weekStartsOn} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Event categories</CardTitle>
            <CardDescription>
              Add your own from the event form. Renaming or removing one changes every event that
              uses it; removed ones become General.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventCategoriesList custom={customCategories} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Modules</CardTitle>
            <CardDescription>
              Pages for later releases appear once they ship, if switched on here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModulesForm enabled={prefs.enabledModules} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Dashboard</CardTitle>
            <CardDescription>
              Order the cards and hide the ones you do not need. Cards of switched-off modules stay
              hidden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardLayoutForm
              layout={prefs.dashboardLayout}
              enabledModules={prefs.enabledModules}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
