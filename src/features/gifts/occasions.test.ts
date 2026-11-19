import { describe, expect, it } from 'vitest';
import { inDays, summariseGiftStatus, upcomingOccasions } from './occasions';

const today = '2026-11-19';
const mum = { id: 'r1', name: 'Mum', birthday: '1960-12-01' };
const sam = { id: 'r2', name: 'Sam', birthday: '1992-03-04' };
const gift = (
  recipientId: string,
  status: 'idea' | 'planned' | 'purchased' | 'wrapped' | 'given',
  occasion: string | null = null,
  occasionDate: string | null = null
) => ({ recipientId, status, occasion, occasionDate });

describe('upcomingOccasions', () => {
  it('lists birthdays within the window, soonest first, and skips far ones', () => {
    const rows = upcomingOccasions([sam, mum], [], today);
    expect(rows.map((r) => [r.person, r.occasion, r.dateKey, r.days])).toEqual([
      ['Mum', 'Birthday', '2026-12-01', 12],
    ]);
  });

  it('folds gifts dated on the birthday, or undated birthday gifts, into the birthday row', () => {
    const gifts = [
      gift('r1', 'idea', 'Birthday'),
      gift('r1', 'purchased', 'Her 66th', '2026-12-01'),
      gift('r1', 'given', 'Birthday', '2026-12-01'),
    ];
    const rows = upcomingOccasions([mum], gifts, today);
    expect(rows).toHaveLength(1);
    expect(rows[0].gifts.map((g) => g.status)).toEqual(['idea', 'purchased']);
  });

  it('adds dated occasions and groups gifts by person, occasion and date', () => {
    const gifts = [
      gift('r2', 'idea', 'Christmas', '2026-12-25'),
      gift('r2', 'wrapped', 'christmas', '2026-12-25'),
      gift('r1', 'idea', 'Christmas', '2026-12-25'),
      gift('r2', 'idea', 'Anniversary', '2027-03-01'),
      gift('r2', 'idea', 'Last week', '2026-11-12'),
    ];
    const rows = upcomingOccasions([mum, sam], gifts, today);
    expect(rows.map((r) => `${r.person} ${r.occasion} ${r.gifts.length}`)).toEqual([
      'Mum Birthday 0',
      'Mum Christmas 1',
      'Sam Christmas 2',
    ]);
  });

  it('counts today as upcoming', () => {
    const rows = upcomingOccasions([{ id: 'r3', name: 'Jo', birthday: '2000-11-19' }], [], today);
    expect(rows[0]?.days).toBe(0);
  });
});

describe('inDays', () => {
  it('words the distance', () => {
    expect(inDays(0)).toBe('today');
    expect(inDays(1)).toBe('tomorrow');
    expect(inDays(12)).toBe('in 12 days');
  });
});

describe('summariseGiftStatus', () => {
  it('counts by readiness, most ready first, ignoring given gifts', () => {
    expect(
      summariseGiftStatus([
        { status: 'idea' },
        { status: 'idea' },
        { status: 'purchased' },
        { status: 'given' },
      ])
    ).toBe('1 bought, 2 ideas');
    expect(summariseGiftStatus([{ status: 'wrapped' }])).toBe('1 wrapped');
    expect(summariseGiftStatus([])).toBe('No gift yet');
  });
});
