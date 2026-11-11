import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { env } from '@/env';
import { IcsFeedCard } from '@/features/integrations/components/ics-feed-card';
import { ReminderChannelsForm } from '@/features/integrations/components/reminder-channels-form';
import { getIntegrationSettings, icsFeedUrl } from '@/features/integrations/service';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Integrations' };
export const dynamic = 'force-dynamic';

export default async function IntegrationsPage() {
  const user = await requireUser();
  const settings = await getIntegrationSettings(user.id);
  const feedUrl = settings.icsToken
    ? icsFeedUrl(env.NEXT_PUBLIC_SITE_URL, settings.icsToken)
    : null;
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Integrations"
        description="Calendar subscriptions, reminder channels and connected accounts."
      />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Calendar subscription</CardTitle>
            </h2>
            <CardDescription>
              Events, tasks with due dates, milestones, time blocks and shifts, read-only, in Apple
              Calendar, Google Calendar or Outlook.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IcsFeedCard feedUrl={feedUrl} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Reminders</CardTitle>
            </h2>
            <CardDescription>
              Reminders always appear in the app. Choose whether they also reach you by email or
              browser push.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReminderChannelsForm
              emailReminders={settings.emailReminders}
              pushReminders={settings.pushReminders}
              digestHour={settings.digestHour}
              emailConfigured={Boolean(env.RESEND_API_KEY)}
              pushConfigured={Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)}
              pushDevices={settings.pushDevices}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2>
              <CardTitle className="font-heading text-lg">Google Calendar</CardTitle>
            </h2>
            <CardDescription>
              Two-way sync with one Google calendar: planner events are written there, and its
              events appear read-only in the Life Calendar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settings.connection ? (
              <p className="text-sm">
                Connected as {settings.connection.accountEmail ?? 'a Google account'}
                {settings.connection.calendarName && ` (${settings.connection.calendarName})`}.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                {process.env.GOOGLE_CLIENT_ID
                  ? 'Not connected yet.'
                  : 'Google sign-in credentials are not configured on this deployment yet, so there is nothing to connect.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
