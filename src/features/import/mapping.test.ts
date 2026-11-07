import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/legacy-sample.json';
import { guessHabitSegment, planImport } from './mapping';
import { legacyExport } from './schema';

const segments = {
  faith: 'seg-faith',
  finance: 'seg-finance',
  health: 'seg-health',
  career: 'seg-career',
  learning: 'seg-learning',
  growth: 'seg-growth',
  recreation: 'seg-recreation',
};
const opts = { now: new Date('2026-03-06T12:00:00Z'), timeZone: 'America/Jamaica' };

describe('planImport', () => {
  const legacy = legacyExport.parse(fixture);
  const plan = planImport(legacy, segments, opts);

  it('maps tasks to segments and turns unfiled ones into captures', () => {
    expect(plan.tasks).toHaveLength(3);
    const done = plan.tasks.find((t) => t.title === 'Review Quarterly Budget')!;
    expect(done).toMatchObject({
      lifeSegmentId: 'seg-finance',
      status: 'done',
      priority: 'high',
      dueDate: '2026-01-15',
    });
    expect(done.completedAt).toEqual(opts.now);
    expect(plan.tasks.find((t) => t.title === 'Call Mom')).toMatchObject({
      lifeSegmentId: 'seg-recreation',
      priority: 'medium',
    });
    expect(plan.captures).toEqual([{ key: '999001', text: 'Unfiled idea from the old app' }]);
  });

  it('converts habit logs (epoch millis) to local dates once each', () => {
    const bible = plan.habits.find((h) => h.name.startsWith('Read Bible'))!;
    expect(bible.lifeSegmentId).toBe('seg-faith');
    expect(bible.target).toBe(25);
    expect(bible.checkInDates).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });

  it('turns per-segment goals into annual goals with achieved status', () => {
    expect(plan.goals.find((g) => g.title === 'Daily Prayer')).toMatchObject({
      key: 'God:0',
      lifeSegmentId: 'seg-faith',
      horizon: 'annual',
      status: 'achieved',
    });
  });

  it('builds morning and evening routines with ordered steps', () => {
    expect(plan.routines.map((r) => r.kind)).toEqual(['morning', 'evening']);
    expect(plan.routines[0].steps.map((s) => s.title)).toEqual([
      'Pray & Meditate',
      'Make Bed',
      'Drink Water',
    ]);
    expect(plan.routines[0].steps[2]).toMatchObject({ key: 'morning:2', sortOrder: 2 });
  });

  it('counts the sections deferred to later releases', () => {
    expect(plan.deferred).toEqual({
      bibleStudies: 1,
      studies: 0,
      recipes: 1,
      mealPlan: 2,
      journal: 1,
      quotes: 1,
    });
    expect(plan.problems).toEqual([]);
  });

  it('falls back when a mapped segment is missing', () => {
    const sparse = planImport(legacy, { growth: 'seg-growth' }, opts);
    expect(sparse.tasks.every((t) => t.lifeSegmentId === 'seg-growth')).toBe(true);
  });
});

describe('guessHabitSegment', () => {
  it('uses keywords and a sensible default', () => {
    expect(guessHabitSegment('Exercise 30m')).toBe('health');
    expect(guessHabitSegment('Read Bible (1ch)')).toBe('faith');
    expect(guessHabitSegment('No spend day')).toBe('finance');
    expect(guessHabitSegment('Tidy desk')).toBe('growth');
  });
});
