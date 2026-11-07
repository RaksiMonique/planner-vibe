import { describe, expect, it } from 'vitest';
import { presetForReminder, resolveReminderAt } from './schema';

const tz = 'America/Jamaica'; // UTC-5, no DST

describe('resolveReminderAt', () => {
  const dueAt = new Date('2026-11-10T19:30:00Z'); // 14:30 local

  it('uses the exact instant when the record has one', () => {
    expect(resolveReminderAt('at_time', undefined, { dueAt, timeZone: tz })).toEqual(dueAt);
    expect(resolveReminderAt('1h_before', undefined, { dueAt, timeZone: tz })?.toISOString()).toBe(
      '2026-11-10T18:30:00.000Z'
    );
    expect(resolveReminderAt('1d_before', undefined, { dueAt, timeZone: tz })?.toISOString()).toBe(
      '2026-11-09T19:30:00.000Z'
    );
  });

  it('falls back to 09:00 local for date-only records', () => {
    const at = resolveReminderAt('at_time', undefined, { dueDateKey: '2026-11-10', timeZone: tz });
    expect(at?.toISOString()).toBe('2026-11-10T14:00:00.000Z');
    const dayBefore = resolveReminderAt('1d_before', undefined, {
      dueDateKey: '2026-11-10',
      timeZone: tz,
    });
    expect(dayBefore?.toISOString()).toBe('2026-11-09T14:00:00.000Z');
  });

  it('interprets a custom value in the user zone and ignores it otherwise', () => {
    expect(
      resolveReminderAt('custom', '2026-11-12T08:15', { dueAt, timeZone: tz })?.toISOString()
    ).toBe('2026-11-12T13:15:00.000Z');
    expect(resolveReminderAt('custom', undefined, { dueAt, timeZone: tz })).toBeNull();
    expect(resolveReminderAt('none', '2026-11-12T08:15', { dueAt, timeZone: tz })).toBeNull();
    expect(resolveReminderAt('at_time', undefined, { timeZone: tz })).toBeNull();
  });
});

describe('presetForReminder', () => {
  const dueAt = new Date('2026-11-10T19:30:00Z');
  it('recognises the presets it produced and falls back to custom', () => {
    for (const preset of ['at_time', '1h_before', '1d_before'] as const) {
      const at = resolveReminderAt(preset, undefined, { dueAt, timeZone: tz });
      expect(presetForReminder(at, { dueAt, timeZone: tz }).preset).toBe(preset);
    }
    const odd = presetForReminder(new Date('2026-11-08T12:00:00Z'), { dueAt, timeZone: tz });
    expect(odd).toEqual({ preset: 'custom', custom: '2026-11-08T07:00' });
    expect(presetForReminder(null, { dueAt, timeZone: tz }).preset).toBe('none');
  });
});
