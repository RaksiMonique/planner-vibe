import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_CARDS,
  DEFAULT_LAYOUT,
  moveCard,
  normaliseLayout,
  toggleCard,
  visibleCards,
} from './layout';

const all = { planning: true, work: true } as Record<string, boolean>;

describe('normaliseLayout', () => {
  it('fills a missing layout with the defaults', () => {
    expect(normaliseLayout(null)).toEqual(DEFAULT_LAYOUT);
  });
  it('drops unknown keys, de-duplicates and appends cards added since the layout was saved', () => {
    const out = normaliseLayout({
      order: ['inbox', 'inbox', 'gone', 'week'],
      hidden: ['gone', 'quote'],
    });
    expect(out.order.slice(0, 2)).toEqual(['inbox', 'week']);
    expect(out.order).toHaveLength(DASHBOARD_CARDS.length);
    expect(out.hidden).toEqual(['quote']);
  });
});

describe('visibleCards', () => {
  it('respects order, hidden cards and disabled modules', () => {
    const cards = visibleCards(
      { order: ['inbox', 'job'], hidden: ['week'] },
      { ...all, work: false }
    );
    expect(cards[0].key).toBe('inbox');
    expect(cards.find((c) => c.key === 'job')).toBeUndefined();
    expect(cards.find((c) => c.key === 'week')).toBeUndefined();
  });
});

describe('moveCard and toggleCard', () => {
  it('swaps neighbours and stops at the ends', () => {
    const up = moveCard(DEFAULT_LAYOUT, 'job', -1);
    expect(up.order.slice(0, 2)).toEqual(['job', 'week']);
    expect(moveCard(DEFAULT_LAYOUT, 'week', -1).order).toEqual(DEFAULT_LAYOUT.order);
  });
  it('steps past hidden cards when moving among the visible ones', () => {
    // week, job, routines, habits… with job hidden: moving routines up lands it above week.
    const layout = { ...DEFAULT_LAYOUT, hidden: ['job'] };
    const shown = DEFAULT_LAYOUT.order.filter((k) => k !== 'job');
    const up = moveCard(layout, 'routines', -1, shown);
    expect(up.order.slice(0, 3)).toEqual(['routines', 'week', 'job']);
    const down = moveCard(up, 'routines', 1, shown);
    expect(down.order.slice(0, 3)).toEqual(['week', 'routines', 'job']);
    expect(moveCard(layout, 'week', -1, shown).order).toEqual(layout.order);
  });
  it('hides and shows without duplicates', () => {
    const hidden = toggleCard(DEFAULT_LAYOUT, 'quote', false);
    expect(hidden.hidden).toEqual(['quote']);
    expect(toggleCard(hidden, 'quote', false).hidden).toEqual(['quote']);
    expect(toggleCard(hidden, 'quote', true).hidden).toEqual([]);
  });
});
