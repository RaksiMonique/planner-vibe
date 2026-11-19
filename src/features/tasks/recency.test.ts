import { describe, expect, it } from 'vitest';
import { completedWording } from './recency';

const today = '2026-11-19'; // a Thursday
const tz = 'America/Jamaica';

describe('completedWording', () => {
  it('says today and yesterday in the user zone', () => {
    // 23:30 Jamaica on the 18th is 04:30 UTC on the 19th.
    expect(completedWording(new Date('2026-11-19T04:30:00Z'), today, tz)).toBe('yesterday');
    expect(completedWording(new Date('2026-11-19T12:00:00Z'), today, tz)).toBe('today');
  });

  it('names the weekday inside the last week', () => {
    expect(completedWording(new Date('2026-11-17T15:00:00Z'), today, tz)).toBe('Tuesday');
    expect(completedWording(new Date('2026-11-13T15:00:00Z'), today, tz)).toBe('Friday');
  });

  it('gives the date once a week has passed', () => {
    expect(completedWording(new Date('2026-11-12T15:00:00Z'), today, tz)).toBe('12 Nov');
  });

  it('never says a finish is in the future', () => {
    expect(completedWording(new Date('2026-11-21T15:00:00Z'), today, tz)).toBe('today');
  });
});
