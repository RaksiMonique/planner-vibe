import { describe, expect, it } from 'vitest';
import { breakIdeaInput, pickBreakIdea } from './schema';

const ideas = [
  { id: 'a', isMovement: false },
  { id: 'b', isMovement: true },
  { id: 'c', isMovement: false },
];

describe('pickBreakIdea', () => {
  it('returns null with nothing to pick from', () => {
    expect(pickBreakIdea([])).toBeNull();
  });

  it('spreads plain picks evenly', () => {
    expect(pickBreakIdea(ideas, { random: () => 0 })?.id).toBe('a');
    expect(pickBreakIdea(ideas, { random: () => 0.5 })?.id).toBe('b');
    expect(pickBreakIdea(ideas, { random: () => 0.99 })?.id).toBe('c');
  });

  it('weights movement ideas 2:1 when asked to', () => {
    // Weights a:1, b:2, c:1 → b covers the middle half of the roll.
    const pick = (r: number) => pickBreakIdea(ideas, { preferMovement: true, random: () => r })?.id;
    expect(pick(0.1)).toBe('a');
    expect(pick(0.3)).toBe('b');
    expect(pick(0.7)).toBe('b');
    expect(pick(0.9)).toBe('c');
  });

  it('leaves the previous pick out when there is another choice', () => {
    expect(pickBreakIdea(ideas, { exclude: 'a', random: () => 0 })?.id).toBe('b');
    expect(pickBreakIdea([ideas[0]], { exclude: 'a' })?.id).toBe('a');
  });
});

describe('breakIdeaInput', () => {
  it('trims the title and reads the checkbox', () => {
    const parsed = breakIdeaInput.parse({ title: '  Stretch ', isMovement: true, habitId: '' });
    expect(parsed).toEqual({ title: 'Stretch', isMovement: true, habitId: undefined });
    expect(breakIdeaInput.parse({ title: 'Walk' }).isMovement).toBe(false);
  });

  it('rejects an empty title', () => {
    expect(breakIdeaInput.safeParse({ title: '   ' }).success).toBe(false);
  });
});
