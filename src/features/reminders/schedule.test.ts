import { describe, expect, it } from 'vitest';
import { digestDue } from './schedule';

describe('digestDue', () => {
  const now = new Date('2026-11-10T11:30:00Z'); // 06:30 in Jamaica, 11:30 in London
  it('waits for the local digest hour unless told to ignore it', () => {
    expect(digestDue({ digestHour: 7, digestSentOn: null }, now, 'America/Jamaica')).toEqual({
      send: false,
      todayKey: '2026-11-10',
    });
    expect(digestDue({ digestHour: 7, digestSentOn: null }, now, 'Europe/London').send).toBe(true);
    expect(
      digestDue({ digestHour: 7, digestSentOn: null }, now, 'America/Jamaica', true).send
    ).toBe(true);
  });
  it('never sends twice on the same local day', () => {
    expect(
      digestDue({ digestHour: 7, digestSentOn: '2026-11-10' }, now, 'Europe/London').send
    ).toBe(false);
    expect(
      digestDue({ digestHour: 7, digestSentOn: '2026-11-09' }, now, 'Europe/London').send
    ).toBe(true);
  });
});
