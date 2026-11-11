import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarSyncIcon, LinkIcon, UnlinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/features/tasks/components/native-select';
import { SubmitButton } from '@/components/shared/submit-button';
import { cn } from '@/lib/utils';
import { disconnectGoogleAction, setGoogleCalendarAction, syncGoogleAction } from '../actions';
import type { GoogleCalendar } from '../google';
import type { IntegrationSettings } from '../service';

const STATUS_LABEL = {
  connected: 'Connected',
  error: 'Needs attention',
  revoked: 'Access revoked',
} as const;

export function GoogleCalendarCard({
  configured,
  connection,
  calendars,
  currentCalendarId,
  notice,
}: {
  configured: boolean;
  connection: IntegrationSettings['connection'];
  calendars: GoogleCalendar[];
  currentCalendarId: string | null;
  notice: string | null;
}) {
  if (!configured) {
    return (
      <p className="text-muted-foreground text-sm">
        Google credentials are not configured on this deployment yet, so there is nothing to
        connect. See the README, Integrations.
      </p>
    );
  }
  if (!connection) {
    return (
      <div className="flex flex-col gap-3">
        {notice && <p className="text-destructive text-sm">{notice}</p>}
        <p className="text-muted-foreground text-sm">
          Connecting asks Google for permission to read and write one calendar of your choice.
        </p>
        <Link
          href="/api/google/connect"
          prefetch={false}
          className={cn(buttonVariants({ size: 'sm' }), 'self-start')}
        >
          <LinkIcon data-icon="inline-start" />
          Connect Google Calendar
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {notice && <p className="text-sm">{notice}</p>}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>{connection.accountEmail ?? 'Google account'}</span>
        <Badge variant={connection.status === 'connected' ? 'secondary' : 'destructive'}>
          {STATUS_LABEL[connection.status]}
        </Badge>
        {connection.lastSyncedAt && (
          <span className="text-muted-foreground text-xs">
            Last synced {format(connection.lastSyncedAt, 'd MMM, HH:mm')}
          </span>
        )}
      </div>
      {connection.lastError && <p className="text-destructive text-xs">{connection.lastError}</p>}
      <form
        action={setGoogleCalendarAction}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="google-calendar">Calendar to sync with</Label>
          <NativeSelect
            id="google-calendar"
            name="calendar"
            defaultValue={defaultValue(calendars, currentCalendarId)}
          >
            {calendars.length === 0 && (
              <option
                value={`${currentCalendarId ?? 'primary'}\t${connection.calendarName ?? 'Primary'}`}
              >
                {connection.calendarName ?? 'Primary'}
              </option>
            )}
            {calendars.map((c) => (
              <option key={c.id} value={`${c.id}\t${c.summary}`}>
                {c.summary}
                {c.primary ? ' (primary)' : ''}
              </option>
            ))}
          </NativeSelect>
        </div>
        <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
          Use this calendar
        </SubmitButton>
      </form>
      <div className="flex flex-wrap gap-2">
        <form action={syncGoogleAction}>
          <SubmitButton size="sm" variant="outline" pendingLabel="Syncing…">
            <CalendarSyncIcon data-icon="inline-start" />
            Sync now
          </SubmitButton>
        </form>
        <form action={disconnectGoogleAction}>
          <SubmitButton size="sm" variant="ghost" pendingLabel="Disconnecting…">
            <UnlinkIcon data-icon="inline-start" />
            Disconnect
          </SubmitButton>
        </form>
      </div>
      <p className="text-muted-foreground text-xs">
        Planner events are written to this calendar; its own events appear read-only in the Life
        Calendar. Changing the calendar moves the planner&apos;s copies.
      </p>
    </div>
  );
}

function defaultValue(calendars: GoogleCalendar[], currentId: string | null): string | undefined {
  const match = calendars.find((c) => c.id === currentId) ?? calendars.find((c) => c.primary);
  return match ? `${match.id}\t${match.summary}` : undefined;
}
