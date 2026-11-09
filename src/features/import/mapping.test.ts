import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/legacy-sample.json';
import { guessHabitSegment, planDeferredImport, planImport } from './mapping';
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

  it('defers nothing now that every section imports', () => {
    expect(plan.deferred).toEqual({});
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

describe('planDeferredImport', () => {
  const legacy = legacyExport.parse(fixture);
  const plan = planDeferredImport(legacy, segments, { timeZone: 'America/Jamaica' });

  it('maps Bible studies with kind, status, priority and translation', () => {
    expect(plan.bibleStudies).toEqual([
      {
        key: '1',
        lifeSegmentId: 'seg-faith',
        title: 'Genesis',
        kind: 'study',
        status: 'done',
        priority: 'high',
        translation: 'ESV',
        prerequisiteKey: null,
      },
    ]);
  });

  it('turns studies into a subject per category and a course per study', () => {
    const withStudies = legacyExport.parse({
      ...fixture,
      studies: [
        {
          id: 7,
          title: 'TypeScript basics',
          category: 'Coding',
          deadline: '2026-04-01',
          progress: 40,
        },
        {
          id: 8,
          title: 'Advanced types',
          category: 'coding',
          progress: 100,
          notes: 'Finish the exercises',
        },
        { id: 9, title: 'Untitled', category: null },
      ],
    });
    const p = planDeferredImport(withStudies, segments, { timeZone: 'America/Jamaica' });
    expect(p.subjects.map((s) => s.name)).toEqual(['Coding', 'General']);
    expect(p.courses).toHaveLength(3);
    expect(p.courses[0]).toMatchObject({
      key: '7',
      lifeSegmentId: 'seg-learning',
      subjectKey: 'subject:coding',
      dueDate: '2026-04-01',
      progress: 40,
    });
    expect(p.courses[1]).toMatchObject({
      subjectKey: 'subject:coding',
      progress: 100,
      notes: 'Finish the exercises',
    });
    expect(p.courses[2]).toMatchObject({ subjectKey: 'subject:general', dueDate: null });
  });

  it('keeps journal days and quotes, and tolerates null sections', () => {
    expect(plan.journal).toEqual([
      {
        key: '2026-03-01',
        lifeSegmentId: 'seg-growth',
        date: '2026-03-01',
        content: 'A quiet day.',
      },
    ]);
    expect(plan.quotes).toEqual([
      {
        key: '1',
        lifeSegmentId: 'seg-growth',
        content: 'Do small things with great love.',
        author: 'St Teresa',
        source: null,
        title: 'Saint',
      },
    ]);
    expect(plan.subjects).toEqual([]);
    expect(plan.stillDeferred).toEqual({});
    expect(plan.problems).toEqual([]);
  });

  it('resolves prerequisite keys and skips unreadable records', () => {
    const p = planDeferredImport(
      legacyExport.parse({
        ...fixture,
        bibleStudies: [
          { id: 1, name: 'Genesis', status: 'In Progress', priority: 'Low', type: 'Reading plan' },
          { id: 2, name: 'Exodus', prereqId: 1, type: 'Devotional', status: 'Not Started' },
          { nope: true },
        ],
      }),
      segments,
      { timeZone: 'America/Jamaica' }
    );
    expect(p.bibleStudies.map((b) => [b.kind, b.status, b.priority, b.prerequisiteKey])).toEqual([
      ['reading', 'in_progress', 'low', null],
      ['devotional', 'not_started', 'medium', '1'],
    ]);
    expect(p.problems).toHaveLength(1);
  });
});

describe('planDeferredImport: recipes and meal plan', () => {
  const legacy = legacyExport.parse(fixture);
  const segmentsWithHome = { ...segments, home: 'seg-home' };

  it('maps recipes with ordered ingredients', () => {
    const plan = planDeferredImport(legacy, segmentsWithHome, { timeZone: 'America/Jamaica' });
    expect(plan.recipes).toEqual([
      {
        key: '1',
        title: 'Chicken Curry',
        instructions: '1. Prep ingredients.\n2. Cook according to taste.\n3. Serve hot.',
        ingredients: [
          { name: 'Chicken', quantity: 500, unit: 'g', sortOrder: 0 },
          { name: 'Curry Paste', quantity: 2, unit: 'tbsp', sortOrder: 1 },
        ],
      },
    ]);
  });

  it('groups meal plan days into weeks by the week start and keeps the recipe key', () => {
    const plan = planDeferredImport(legacy, segmentsWithHome, {
      timeZone: 'America/Jamaica',
      weekStartsOn: 1,
    });
    expect(plan.mealWeeks).toEqual([
      {
        key: '2026-03-02',
        lifeSegmentId: 'seg-home',
        startDate: '2026-03-02',
        endDate: '2026-03-08',
        entries: [
          { key: '2026-03-06', date: '2026-03-06', recipeKey: '1' },
          { key: '2026-03-07', date: '2026-03-07', recipeKey: '2' },
        ],
      },
    ]);
    const sunday = planDeferredImport(legacy, segmentsWithHome, {
      timeZone: 'America/Jamaica',
      weekStartsOn: 0,
    });
    expect(sunday.mealWeeks.map((w) => w.key)).toEqual(['2026-03-01']);
  });

  it('skips unreadable recipes, blank quantities and empty meal days', () => {
    const plan = planDeferredImport(
      legacyExport.parse({
        ...fixture,
        recipes: [
          { id: 2, name: 'Toast', ingredients: [{ name: 'Bread', qty: 0 }, { name: ' ' }] },
          { nope: 1 },
        ],
        mealPlan: { '2026-03-09': null, '2026-03-10': '2', 'not a date': 1 },
      }),
      segmentsWithHome,
      { timeZone: 'America/Jamaica' }
    );
    expect(plan.recipes).toEqual([
      {
        key: '2',
        title: 'Toast',
        instructions: null,
        ingredients: [{ name: 'Bread', quantity: null, unit: null, sortOrder: 0 }],
      },
    ]);
    expect(plan.mealWeeks).toHaveLength(1);
    expect(plan.mealWeeks[0].entries).toEqual([
      { key: '2026-03-10', date: '2026-03-10', recipeKey: '2' },
    ]);
    expect(plan.problems).toHaveLength(1);
  });
});
