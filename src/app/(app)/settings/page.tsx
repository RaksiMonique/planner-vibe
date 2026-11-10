import type { Metadata } from 'next';
import Link from 'next/link';
import { DatabaseIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ModulesForm } from '@/features/settings/components/modules-form';
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
  const [profile, prefs] = await Promise.all([getProfile(user.id), getPreferences(user.id)]);

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
            <CardTitle className="font-heading text-lg">Modules</CardTitle>
            <CardDescription>
              Pages for later releases appear once they ship, if switched on here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModulesForm enabled={prefs.enabledModules} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
