import { describe, expect, it } from 'vitest';
import { daysUntil, formatMoney, groupGiftsByOccasion, nextAnniversary } from './grouping';

describe('daysUntil', () => {
  it('counts calendar days, negative for the past', () => {
    expect(daysUntil('2026-11-10', '2026-11-07')).toBe(3);
    expect(daysUntil('2026-11-07', '2026-11-07')).toBe(0);
    expect(daysUntil('2026-11-01', '2026-11-07')).toBe(-6);
  });
});

describe('nextAnniversary', () => {
  it('returns this year when still ahead, next year otherwise', () => {
    expect(nextAnniversary('1990-12-25', '2026-11-07')).toBe('2026-12-25');
    expect(nextAnniversary('1990-03-01', '2026-11-07')).toBe('2027-03-01');
    expect(nextAnniversary('1990-11-07', '2026-11-07')).toBe('2026-11-07');
  });
  it('moves a 29 February birthday to the 28th in non-leap years', () => {
    expect(nextAnniversary('1992-02-29', '2026-11-07')).toBe('2027-02-28');
    expect(nextAnniversary('1992-02-29', '2028-01-01')).toBe('2028-02-29');
  });
});

describe('groupGiftsByOccasion', () => {
  const gifts = [
    { occasion: 'Christmas', occasionDate: '2026-12-25', budget: '50', price: null },
    { occasion: 'Christmas', occasionDate: '2026-12-25', budget: 20, price: '18.50' },
    { occasion: "Mum's birthday", occasionDate: '2026-11-20', budget: null, price: null },
    { occasion: 'Easter', occasionDate: '2026-04-05', budget: 10, price: 10 },
    { occasion: null, occasionDate: null, budget: null, price: 5 },
  ];
  it('splits upcoming, undated and past and totals budget against price', () => {
    const { upcoming, undated, past } = groupGiftsByOccasion(gifts, '2026-11-07');
    expect(upcoming.map((g) => g.label)).toEqual(["Mum's birthday", 'Christmas']);
    expect(upcoming[1]).toMatchObject({ budget: 70, price: 18.5 });
    expect(upcoming[1].gifts).toHaveLength(2);
    expect(undated.map((g) => g.label)).toEqual(['No occasion']);
    expect(past.map((g) => g.label)).toEqual(['Easter']);
  });
});

describe('formatMoney', () => {
  it('formats with the currency and tolerates blanks', () => {
    expect(formatMoney('18.5', 'USD')).toBe('$18.50');
    expect(formatMoney(null, 'USD')).toBe('');
  });
});
