import { describe, expect, it } from 'vitest';
import {
  moveInHistory,
  visitLocation,
  type NavigationHistory,
  type AppLocation,
} from './navigation';
const today: AppLocation = { view: 'today', projectId: null, date: '2026-11-15' };
const start = (): NavigationHistory => ({ entries: [today], index: 0 });

describe('navigation history', () => {
  it('restores the exact project and day when moving back and forward', () => {
    const subject: AppLocation = { view: 'projects', projectId: 'calculus', date: '2026-11-14' };
    const projects = visitLocation(start(), subject);
    const focus = visitLocation(projects, { ...today, view: 'focus' });
    const back = moveInHistory(focus, -1);
    expect(back.entries[back.index]).toEqual(subject);
    const forward = moveInHistory(back, 1);
    expect(forward.entries[forward.index].view).toBe('focus');
  });
  it('drops the forward branch after choosing a new destination', () => {
    const tasks = visitLocation(start(), { ...today, view: 'tasks' });
    const project = visitLocation(tasks, { ...today, view: 'projects', projectId: 'study' });
    const back = moveInHistory(project, -1);
    const next = visitLocation(back, { ...today, view: 'focus' });
    expect(next.entries.map((entry) => entry.view)).toEqual(['today', 'tasks', 'focus']);
    expect(moveInHistory(next, 1)).toBe(next);
  });
  it('ignores repeated destinations and stops at both boundaries', () => {
    const first = start();
    expect(moveInHistory(first, -1)).toBe(first);
    expect(moveInHistory(first, 1)).toBe(first);
    expect(visitLocation(first, { ...today })).toBe(first);
  });
});
