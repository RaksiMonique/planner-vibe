import { describe, expect, it } from 'vitest';
import { nextStudy } from './studies';

const at = (iso: string) => new Date(iso);
const study = (over: Partial<Parameters<typeof nextStudy>[0][number]> & { id: string }) => ({
  status: 'not_started' as const,
  priority: 'medium' as const,
  prerequisiteId: null,
  updatedAt: at('2026-01-01'),
  ...over,
});

describe('nextStudy', () => {
  it('continues an open study before starting a new one', () => {
    const next = nextStudy([
      study({ id: 'fresh', priority: 'high' }),
      study({ id: 'open', status: 'in_progress', priority: 'low' }),
    ]);
    expect(next).toMatchObject({ mode: 'continue', study: { id: 'open' } });
  });

  it('prefers the open study with the higher priority, then the most recent', () => {
    expect(
      nextStudy([
        study({ id: 'a', status: 'in_progress', updatedAt: at('2026-03-01') }),
        study({ id: 'b', status: 'in_progress', updatedAt: at('2026-04-01') }),
        study({ id: 'c', status: 'in_progress', priority: 'low', updatedAt: at('2026-05-01') }),
      ])?.study.id
    ).toBe('b');
  });

  it('suggests the next unstarted study whose prerequisite is done', () => {
    const next = nextStudy([
      study({ id: 'done', status: 'done' }),
      study({ id: 'blocked', priority: 'high', prerequisiteId: 'later' }),
      study({ id: 'later' }),
      study({ id: 'ready', priority: 'high', prerequisiteId: 'done' }),
    ]);
    expect(next).toMatchObject({ mode: 'start', study: { id: 'ready' } });
  });

  it('has nothing to suggest when everything is done', () => {
    expect(nextStudy([study({ id: 'done', status: 'done' })])).toBeUndefined();
  });
});
