import { describe, expect, it } from 'vitest';
import { buildAuthUrl, emailFromIdToken, fromGoogleEvent, toGoogleEvent } from './google';

describe('buildAuthUrl', () => {
  it('asks for offline calendar access with the state round-tripped', () => {
    const url = new URL(
      buildAuthUrl({ clientId: 'cid', siteUrl: 'https://planner.test/', state: 's1' })
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('redirect_uri')).toBe('https://planner.test/api/google/callback');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('state')).toBe('s1');
    expect(url.searchParams.get('scope')).toContain('calendar.events');
  });
});

describe('toGoogleEvent', () => {
  const base = { id: 'e1', title: 'Dentist', description: null, location: 'Town', rrule: null };
  it('maps a timed event with the planner id in private properties', () => {
    const g = toGoogleEvent(
      {
        ...base,
        isAllDay: false,
        startsAt: new Date('2026-11-12T14:30:00Z'),
        endsAt: null,
        allDayDate: null,
      },
      'Europe/London'
    )!;
    expect(g.start).toEqual({ dateTime: '2026-11-12T14:30:00.000Z', timeZone: 'Europe/London' });
    expect(g.end.dateTime).toBe('2026-11-12T15:30:00.000Z');
    expect(g.extendedProperties.private.plannerEventId).toBe('e1');
    expect(g.recurrence).toBeUndefined();
  });
  it('maps an all-day event with an exclusive end and prefixes bare rules', () => {
    const g = toGoogleEvent(
      {
        ...base,
        isAllDay: true,
        startsAt: null,
        endsAt: null,
        allDayDate: '2026-12-31',
        rrule: 'FREQ=YEARLY',
      },
      'UTC'
    )!;
    expect(g.start).toEqual({ date: '2026-12-31' });
    expect(g.end).toEqual({ date: '2027-01-01' });
    expect(g.recurrence).toEqual(['RRULE:FREQ=YEARLY']);
  });
  it('returns null when the event has no usable start', () => {
    expect(
      toGoogleEvent(
        { ...base, isAllDay: false, startsAt: null, endsAt: null, allDayDate: null },
        'UTC'
      )
    ).toBeNull();
  });
});

describe('fromGoogleEvent', () => {
  it("skips cancelled events and the planner's own, keeps the rest", () => {
    expect(fromGoogleEvent({ id: 'x', status: 'cancelled' })).toBeNull();
    expect(
      fromGoogleEvent({
        id: 'y',
        summary: 'Ours',
        extendedProperties: { private: { plannerEventId: 'e1' } },
      })
    ).toBeNull();
    const row = fromGoogleEvent({
      id: 'z',
      summary: '  Team lunch ',
      start: { dateTime: '2026-11-12T12:00:00Z' },
      end: { dateTime: '2026-11-12T13:00:00Z' },
      htmlLink: 'https://calendar.google.com/x',
    })!;
    expect(row).toMatchObject({
      externalId: 'z',
      title: 'Team lunch',
      isAllDay: false,
      allDayDate: null,
    });
    expect(row.startsAt?.toISOString()).toBe('2026-11-12T12:00:00.000Z');
    const allDay = fromGoogleEvent({
      id: 'a',
      start: { date: '2026-11-13' },
      end: { date: '2026-11-14' },
    })!;
    expect(allDay).toMatchObject({
      isAllDay: true,
      allDayDate: '2026-11-13',
      allDayEnd: '2026-11-14',
      title: '(No title)',
    });
  });
});

describe('emailFromIdToken', () => {
  it('reads the email claim without verifying', () => {
    const payload = Buffer.from(JSON.stringify({ email: 'me@example.com' })).toString('base64url');
    expect(emailFromIdToken(`h.${payload}.s`)).toBe('me@example.com');
    expect(emailFromIdToken('nonsense')).toBeNull();
    expect(emailFromIdToken(undefined)).toBeNull();
  });
});
