import { describe, expect, it } from 'vitest';
import { tableByKey } from '@/features/export/tables';
import { chunks, prepareRow } from './prepare';

const tasks = () => tableByKey('tasks')!;
const goals = () => tableByKey('goals')!;

describe('prepareRow', () => {
  it('remaps foreign keys, defers self references and revives timestamps', () => {
    const idMap = new Map([['seg-old', 'seg-new']]);
    const result = prepareRow(
      tasks(),
      {
        id: 'task-old',
        userId: 'someone-else',
        lifeSegmentId: 'seg-old',
        projectId: 'project-never-imported',
        parentTaskId: 'parent-old',
        title: 'Renew passport',
        createdAt: '2026-11-01T10:00:00.000Z',
        unknownColumn: 'ignored',
      },
      'me',
      idMap
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row.values).toMatchObject({
      userId: 'me',
      lifeSegmentId: 'seg-new',
      projectId: null,
      parentTaskId: null,
      title: 'Renew passport',
    });
    expect(result.row.values.id).toBeUndefined();
    expect(result.row.values.unknownColumn).toBeUndefined();
    expect(result.row.values.createdAt).toBeInstanceOf(Date);
    expect(result.row.deferred).toEqual({ parentTaskId: 'parent-old' });
  });

  it('refuses a row whose required reference was not imported', () => {
    const result = prepareRow(
      goals(),
      { id: 'g', lifeSegmentId: 'missing', title: 'x' },
      'me',
      new Map()
    );
    expect(result).toEqual({
      ok: false,
      reason: 'lifeSegmentId points at a lifeSegments row that was not imported',
    });
  });

  it('remaps polymorphic id columns that have no foreign key', () => {
    const reminders = tableByKey('reminders')!;
    const idMap = new Map([['task-old', 'task-new']]);
    const result = prepareRow(
      reminders,
      { id: 'r', entityType: 'task', entityId: 'task-old', remindAt: '2026-11-02T09:00:00.000Z' },
      'me',
      idMap
    );
    expect(result.ok && result.row.values.entityId).toBe('task-new');
  });
});

describe('chunks', () => {
  it('splits evenly and keeps the remainder', () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunks([], 3)).toEqual([]);
  });
});
