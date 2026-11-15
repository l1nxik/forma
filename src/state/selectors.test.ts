import { describe, it, expect } from 'vitest';
import { filterTasks, planTasks, sortTasks, completedOn } from './selectors';
import type { Task } from '../api/client';
const task = (id: string, completed = false): Task => ({
  id,
  title: id,
  notes: '',
  projectId: null,
  scheduledDate: null,
  deadline: null,
  completed,
  priority: 'none',
  estimateMinutes: 0,
  createdAt: '2026-11-15T00:00:00Z',
  updatedAt: '2026-11-15T00:00:00Z',
  completedAt: null,
  revision: 0,
});
describe('explicit plans and task lists', () => {
  it('keeps manual plan order independently from priorities', () => {
    const a = task('a'),
      b = task('b');
    b.priority = 'high';
    expect(planTasks([a, b], ['a', 'b']).map((t) => t.id)).toEqual(['a', 'b']);
    expect(sortTasks([a, b]).map((t) => t.id)).toEqual(['b', 'a']);
  });
  it('ignores deleted tasks in an older plan', () =>
    expect(planTasks([task('a')], ['missing', 'a'])).toHaveLength(1));
  it('filters projects, status and notes together', () => {
    const a = task('a');
    a.projectId = 'project';
    a.notes = 'Лабораторная';
    const b = task('b', true);
    expect(filterTasks([a, b], 'ЛАБОРАТОРНАЯ', 'project', 'active')).toEqual([a]);
    expect(filterTasks([a, b], '', 'none', 'all')).toEqual([b]);
  });
  it('does not mutate the saved task array while sorting', () => {
    const a = task('a'),
      b = task('b');
    b.priority = 'high';
    const source = [a, b];
    sortTasks(source);
    expect(source).toEqual([a, b]);
  });
});

it('includes tasks completed today even when they were not planned', () => {
  const a = task('outside-plan', true);
  a.completedAt = new Date(2026, 10, 15, 15).toISOString();
  expect(completedOn([a], '2026-11-15')).toEqual([a]);
  expect(completedOn([a], '2026-11-14')).toEqual([]);
});
