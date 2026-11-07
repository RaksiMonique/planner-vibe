import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POMODORO,
  stateFromElapsed,
  formatClock,
  isPhaseOver,
  nextPhase,
  phaseMinutes,
  remainingMs,
  startPomodoro,
} from './pomodoro';

const MIN = 60_000;

describe('pomodoro cycle', () => {
  it('starts with a work phase and no Pomodoros', () => {
    expect(startPomodoro(0)).toEqual({ phase: 'work', completedWork: 0, phaseStartedAt: 0 });
  });

  it('alternates work and short breaks, with a long break after the fourth work phase', () => {
    let s = startPomodoro(0);
    const phases: string[] = [];
    for (let i = 0; i < 8; i++) {
      s = nextPhase(s, DEFAULT_POMODORO, i * MIN);
      phases.push(s.phase);
    }
    expect(phases).toEqual([
      'break',
      'work',
      'break',
      'work',
      'break',
      'work',
      'long_break',
      'work',
    ]);
    expect(s.completedWork).toBe(4);
  });

  it('counts down the phase length and knows when it is over', () => {
    const s = startPomodoro(1000);
    expect(phaseMinutes('work', DEFAULT_POMODORO)).toBe(25);
    expect(remainingMs(s, DEFAULT_POMODORO, 1000 + 10 * MIN)).toBe(15 * MIN);
    expect(isPhaseOver(s, DEFAULT_POMODORO, 1000 + 25 * MIN)).toBe(true);
    expect(isPhaseOver(s, DEFAULT_POMODORO, 1000 + 24 * MIN)).toBe(false);
    expect(remainingMs(s, DEFAULT_POMODORO, 1000 + 60 * MIN)).toBe(0);
  });

  it('formats a clock', () => {
    expect(formatClock(25 * MIN)).toBe('25:00');
    expect(formatClock(61_000)).toBe('01:01');
    expect(formatClock(0)).toBe('00:00');
  });

  it('rebuilds the state from elapsed time after a reload', () => {
    // 25 work + 5 break + 25 work: 55 minutes in → second break just started
    const s = stateFromElapsed(0, 55 * MIN + 1, DEFAULT_POMODORO);
    expect(s.phase).toBe('break');
    expect(s.completedWork).toBe(2);
    expect(s.phaseStartedAt).toBe(55 * MIN);
    const t = stateFromElapsed(0, 10 * MIN, DEFAULT_POMODORO);
    expect(t).toEqual({ phase: 'work', completedWork: 0, phaseStartedAt: 0 });
  });
});
