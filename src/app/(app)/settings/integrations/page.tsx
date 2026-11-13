import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { env } from '@/env';
import { GoogleCalendarCard } from '@/features/integrations/components/google-calendar-card';
import { googleConfigured } from '@/features/integrations/google';
import { getConnection, listGoogleCalendars } from '@/features/integrations/google-sync';
import { IcsFeedCard } from '@/features/integrations/components/ics-feed-card';
import { PushSubscribeButton } from '@/features/integrations/components/push-subscribe-button';
import { ReminderChannelsForm } from '@/features/integrations/components/reminder-channels-form';
import { getIntegrationSettings, icsFeedUrl } from '@/features/integrations/service';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Integrations' };
export const dynamic = 'force-dynamic';

const NOTICES: Record<string, string> = {
  connected: 'Google Calendar is connected and the first sync has run.',
  google_failed: "Google didn't complete the connection. Try again.",
  google_not_configured: 'Google credentials are not configured on this deployment.',
};

export default async function IntegrationsPage({
  searchParams,
}: PageProps<'/settings/integrations'>) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const settings = await getIntegrationSettings(user.id);
  const configured = googleConfigured() && Boolean(env.TOKEN_ENCRYPTION_KEY);
  const connection = configured ? await getConnection(user.id) : null;
  const calendars = connection ? await listGoogleCalendars(user.id).catch(() => []) : [];
  const noticeKey =
    typeof params.google === 'string'
      ? params.google
      : typeof params.error === 'string'
        ? params.error
        : null;
  const feedUrl = settings.icsToken
    ? icsFeedUrl(env.NEXT_PUBLIC_SITE_URL, settings.icsToken)
    : null;
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Settings', href: '/settings' }]}
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
              pushConfigured={Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)}
              pushDevices={settings.pushDevices}
            />
            {env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
              <div className="mt-4 border-t pt-4">
                <PushSubscribeButton publicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
              </div>
            )}
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
            <GoogleCalendarCard
              configured={configured}
              connection={settings.connection}
              calendars={calendars}
              currentCalendarId={connection?.calendarId ?? null}
              notice={noticeKey ? (NOTICES[noticeKey] ?? null) : null}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
