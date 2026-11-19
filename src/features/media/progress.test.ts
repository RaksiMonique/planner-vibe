import { describe, expect, it } from 'vitest';
import { progressPercent } from './progress';

describe('progressPercent', () => {
  it('reads an explicit percentage', () => {
    expect(progressPercent('45%')).toBe(45);
    expect(progressPercent('about 60 percent in')).toBe(60);
    expect(progressPercent('12.6 %')).toBe(13);
    expect(progressPercent('150%')).toBe(100);
  });

  it('gives null for pages, episodes and nothing', () => {
    expect(progressPercent('p. 120')).toBeNull();
    expect(progressPercent('S2E3')).toBeNull();
    expect(progressPercent('')).toBeNull();
    expect(progressPercent(null)).toBeNull();
  });
});
