import { describe, expect, it } from 'vitest';
import { endAfterStart } from './times';

describe('endAfterStart', () => {
  it('puts an empty end an hour after the start', () => {
    expect(endAfterStart('', '', '2030-01-15T10:00')).toBe('2030-01-15T11:00');
  });

  it('keeps the length when the start moves', () => {
    expect(endAfterStart('2030-01-15T12:30', '2030-01-15T10:00', '2030-01-15T14:00')).toBe(
      '2030-01-15T16:30'
    );
  });

  it('repairs an end that would fall before the start', () => {
    expect(endAfterStart('2030-01-15T09:00', '2030-01-15T10:00', '2030-01-16T08:00')).toBe(
      '2030-01-16T09:00'
    );
  });

  it('leaves the end alone while the start is empty', () => {
    expect(endAfterStart('2030-01-15T12:00', '2030-01-15T10:00', '')).toBe('2030-01-15T12:00');
  });

  it('crosses midnight', () => {
    expect(endAfterStart('', '', '2030-01-15T23:30')).toBe('2030-01-16T00:30');
  });
});
