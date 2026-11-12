import { describe, expect, it } from 'vitest';
import { queuedBehind, queueTargets, type QueueLike } from './plans';

const plan = (
  id: string,
  status: QueueLike['status'],
  startsAfterPlanId: string | null = null
): QueueLike => ({ id, name: id, status, startsAfterPlanId });

describe('queuedBehind', () => {
  it('is nothing for a plan that starts on its own', () => {
    expect(queuedBehind(plan('a', 'active'), [plan('a', 'active')])).toBeUndefined();
  });

  it('names the unfinished plan in front', () => {
    const plans = [plan('a', 'active'), plan('b', 'paused', 'a')];
    expect(queuedBehind(plans[1], plans)?.id).toBe('a');
  });

  it('is nothing once the plan in front is done', () => {
    const plans = [plan('a', 'done'), plan('b', 'paused', 'a')];
    expect(queuedBehind(plans[1], plans)).toBeUndefined();
  });

  it('is nothing when the plan in front is gone', () => {
    expect(queuedBehind(plan('b', 'paused', 'missing'), [plan('b', 'paused', 'missing')])).toBe(
      undefined
    );
  });
});

describe('queueTargets', () => {
  it('offers unfinished plans that have nothing behind them', () => {
    const plans = [plan('a', 'active'), plan('b', 'paused', 'a'), plan('c', 'done')];
    expect(queueTargets(plans).map((p) => p.id)).toEqual(['b']);
  });

  it('offers nothing when every plan is done or taken', () => {
    expect(queueTargets([plan('a', 'done')])).toEqual([]);
  });
});
