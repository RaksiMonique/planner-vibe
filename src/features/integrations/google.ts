/**
 * Google Calendar over plain fetch (instructions.md 9.1): OAuth URLs and
 * token exchange, the calendar list, and incremental event sync. The pure
 * mapping functions are unit-tested; the fetch wrappers are thin.
 */

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
];

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/calendar/v3';

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, '')}/api/google/callback`;
}

export function buildAuthUrl(input: { clientId: string; siteUrl: string; state: string }): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: redirectUri(input.siteUrl),
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: input.state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
};

export async function exchangeCode(input: {
  code: string;
  siteUrl: string;
}): Promise<TokenResponse> {
  return postToken({
    code: input.code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(input.siteUrl),
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return postToken({ refresh_token: refreshToken, grant_type: 'refresh_token' });
}

async function postToken(fields: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...fields,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  });
  if (!res.ok) throw new GoogleError(res.status, await res.text());
  return (await res.json()) as TokenResponse;
}

export class GoogleError extends Error {
  constructor(
    public status: number,
    detail: string
  ) {
    super(`Google API ${status}: ${detail.slice(0, 200)}`);
  }
}

/** Email claimed by the id_token; display only, so no signature check is needed. */
export function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  const payload = idToken.split('.')[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: string;
    };
    return json.email ?? null;
  } catch {
    return null;
  }
}

async function api<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new GoogleError(res.status, await res.text());
  return (await res.json()) as T;
}

export type GoogleCalendar = { id: string; summary: string; primary?: boolean; accessRole: string };

export async function listCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const data = await api<{ items?: GoogleCalendar[] }>(accessToken, '/users/me/calendarList');
  return (data.items ?? []).filter((c) => c.accessRole === 'owner' || c.accessRole === 'writer');
}

export type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  recurrence?: string[];
  extendedProperties?: { private?: Record<string, string> };
};

export type EventPage = { items: GoogleEvent[]; nextSyncToken?: string };

/** Incremental when a sync token is given; otherwise the window around now. */
export async function listEvents(
  accessToken: string,
  calendarId: string,
  opts: { syncToken?: string | null; timeMin?: Date; timeMax?: Date }
): Promise<EventPage> {
  const items: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const params = new URLSearchParams({ maxResults: '250', singleEvents: 'true' });
    if (opts.syncToken) params.set('syncToken', opts.syncToken);
    else {
      if (opts.timeMin) params.set('timeMin', opts.timeMin.toISOString());
      if (opts.timeMax) params.set('timeMax', opts.timeMax.toISOString());
    }
    if (pageToken) params.set('pageToken', pageToken);
    const page = await api<{
      items?: GoogleEvent[];
      nextPageToken?: string;
      nextSyncToken?: string;
    }>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`);
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
    nextSyncToken = page.nextSyncToken ?? nextSyncToken;
  } while (pageToken);
  return { items, nextSyncToken };
}

export async function insertEvent(accessToken: string, calendarId: string, body: GoogleEventInput) {
  return api<GoogleEvent>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  body: GoogleEventInput
) {
  return api<GoogleEvent>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
}

export async function deleteEvent(accessToken: string, calendarId: string, eventId: string) {
  try {
    await api<void>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    );
  } catch (e) {
    if (e instanceof GoogleError && (e.status === 404 || e.status === 410)) return;
    throw e;
  }
}

export type GoogleEventInput = {
  summary: string;
  description?: string;
  location?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  recurrence?: string[];
  extendedProperties: { private: { plannerEventId: string } };
};

/** The planner event columns the mapping needs. */
export type PlannerEventLike = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  isAllDay: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  allDayDate: string | null;
  rrule?: string | null;
};

export function toGoogleEvent(event: PlannerEventLike, timeZone: string): GoogleEventInput | null {
  const base = {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    extendedProperties: { private: { plannerEventId: event.id } },
    recurrence: event.rrule
      ? [event.rrule.startsWith('RRULE:') ? event.rrule : `RRULE:${event.rrule}`]
      : undefined,
  };
  if (event.isAllDay) {
    if (!event.allDayDate) return null;
    const next = new Date(`${event.allDayDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return {
      ...base,
      start: { date: event.allDayDate },
      end: { date: next.toISOString().slice(0, 10) },
    };
  }
  if (!event.startsAt) return null;
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + 60 * 60 * 1000);
  return {
    ...base,
    start: { dateTime: event.startsAt.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
  };
}

export type ExternalEventInput = {
  externalId: string;
  title: string;
  description: string | null;
  location: string | null;
  isAllDay: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  allDayDate: string | null;
  allDayEnd: string | null;
  htmlLink: string | null;
};

/** Google event → row for external_events; null for cancelled ones and for the planner's own events. */
export function fromGoogleEvent(event: GoogleEvent): ExternalEventInput | null {
  if (event.status === 'cancelled') return null;
  if (event.extendedProperties?.private?.plannerEventId) return null;
  const allDay = Boolean(event.start?.date);
  return {
    externalId: event.id,
    title: event.summary?.trim() || '(No title)',
    description: event.description ?? null,
    location: event.location ?? null,
    isAllDay: allDay,
    startsAt: allDay ? null : event.start?.dateTime ? new Date(event.start.dateTime) : null,
    endsAt: allDay ? null : event.end?.dateTime ? new Date(event.end.dateTime) : null,
    allDayDate: allDay ? (event.start?.date ?? null) : null,
    allDayEnd: allDay ? (event.end?.date ?? null) : null,
    htmlLink: event.htmlLink ?? null,
  };
}

export function isPlannerEvent(event: GoogleEvent): boolean {
  return Boolean(event.extendedProperties?.private?.plannerEventId);
}
