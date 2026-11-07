/** Pure Pomodoro mechanics: phase lengths and cycle counting (instructions.md 8.3). */
export type PomodoroSettings = {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  /** Work phases before a long break. */
  cyclesBeforeLongBreak: number;
};

export const DEFAULT_POMODORO: PomodoroSettings = {
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
};

export type PomodoroPhase = 'work' | 'break' | 'long_break';

export type PomodoroState = {
  phase: PomodoroPhase;
  /** Work phases finished so far in this session. */
  completedWork: number;
  /** Epoch ms when the current phase started. */
  phaseStartedAt: number;
};

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  work: 'Focus',
  break: 'Short break',
  long_break: 'Long break',
};

export function phaseMinutes(phase: PomodoroPhase, settings: PomodoroSettings): number {
  if (phase === 'work') return settings.workMinutes;
  if (phase === 'break') return settings.breakMinutes;
  return settings.longBreakMinutes;
}

export function startPomodoro(now: number): PomodoroState {
  return { phase: 'work', completedWork: 0, phaseStartedAt: now };
}

/** Moves to the next phase. Finishing a work phase counts a Pomodoro. */
export function nextPhase(
  state: PomodoroState,
  settings: PomodoroSettings,
  now: number
): PomodoroState {
  if (state.phase === 'work') {
    const completedWork = state.completedWork + 1;
    const long = completedWork % settings.cyclesBeforeLongBreak === 0;
    return { phase: long ? 'long_break' : 'break', completedWork, phaseStartedAt: now };
  }
  return { phase: 'work', completedWork: state.completedWork, phaseStartedAt: now };
}

export function remainingMs(state: PomodoroState, settings: PomodoroSettings, now: number): number {
  const length = phaseMinutes(state.phase, settings) * 60_000;
  return Math.max(0, state.phaseStartedAt + length - now);
}

export function isPhaseOver(
  state: PomodoroState,
  settings: PomodoroSettings,
  now: number
): boolean {
  return remainingMs(state, settings, now) === 0;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Reconstructs the state of a session that started at `startedAt` and has run
 * uninterrupted since, so a reloaded page shows the right phase and count.
 */
export function stateFromElapsed(
  startedAt: number,
  now: number,
  settings: PomodoroSettings
): PomodoroState {
  let state = startPomodoro(startedAt);
  for (let guard = 0; guard < 1000; guard++) {
    const length = phaseMinutes(state.phase, settings) * 60_000;
    if (state.phaseStartedAt + length > now) return state;
    state = nextPhase(state, settings, state.phaseStartedAt + length);
  }
  return state;
}
