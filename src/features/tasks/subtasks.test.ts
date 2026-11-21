import { describe, expect, it } from 'vitest';
import { MAX_SUBTASKS_AT_ONCE, splitSubtaskLines, taskInput } from './schema';

const base = { title: 'Plan the party', lifeSegmentId: '2c1d9c6e-8a44-4d1f-9b8e-6a9c3c1e2f10' };

describe('splitSubtaskLines', () => {
  it('turns lines into titles and drops blanks and surrounding spaces', () => {
    expect(splitSubtaskLines('Book the venue\n\n  Send invitations  \r\n')).toEqual([
      'Book the venue',
      'Send invitations',
    ]);
  });
  it('accepts an array already and ignores other values', () => {
    expect(splitSubtaskLines(['A', 'B'])).toEqual(['A', 'B']);
    expect(splitSubtaskLines(undefined)).toEqual([]);
    expect(splitSubtaskLines(3)).toEqual([]);
  });
});

describe('taskInput subtaskTitles', () => {
  it('is empty when the box is left blank', () => {
    const parsed = taskInput.safeParse(base);
    expect(parsed.success && (parsed.data.subtaskTitles ?? [])).toEqual([]);
  });
  it('parses the lines typed into the sheet', () => {
    const parsed = taskInput.safeParse({ ...base, subtaskTitles: 'One\nTwo' });
    expect(parsed.success && parsed.data.subtaskTitles).toEqual(['One', 'Two']);
  });
  it('refuses too many at once and over-long lines', () => {
    const many = Array.from({ length: MAX_SUBTASKS_AT_ONCE + 1 }, (_, i) => `Step ${i}`).join('\n');
    expect(taskInput.safeParse({ ...base, subtaskTitles: many }).success).toBe(false);
    expect(taskInput.safeParse({ ...base, subtaskTitles: 'x'.repeat(201) }).success).toBe(false);
  });
});
