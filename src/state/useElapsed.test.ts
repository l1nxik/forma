import { it, expect } from 'vitest';
import { elapsedAt } from './useElapsed';
import type { FocusSession } from '../api/client';
const active: FocusSession = {
  id: 'x',
  kind: 'work',
  state: 'running',
  label: 'Focus',
  projectId: null,
  taskId: null,
  startedAt: '2026-11-15T00:00:00Z',
  endedAt: null,
  targetSeconds: null,
  revision: 0,
  elapsedMilliseconds: 120000,
};
it('continues from the server snapshot and freezes paused sessions', () => {
  expect(elapsedAt(active, 10000, 15000)).toBe(125000);
  expect(elapsedAt({ ...active, state: 'paused' }, 10000, 15000)).toBe(120000);
  expect(elapsedAt(active, 10000, 9000)).toBe(120000);
});
