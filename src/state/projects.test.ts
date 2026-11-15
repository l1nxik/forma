import { describe, it, expect } from 'vitest';
import { descendantIds, projectMilliseconds, projectPath, isProjectArchived } from './projects';
import type { Project } from '../api/client';
const project = (id: string, parentId: string | null, archived = false): Project => ({
  id,
  parentId,
  name: id,
  archived,
  description: '',
  color: 'blue',
  revision: 0,
  createdAt: '2026-11-15T00:00:00Z',
  updatedAt: '2026-11-15T00:00:00Z',
});
describe('project trees', () => {
  it('includes every descendant once and adds distinct recorded time', () => {
    const projects = [
      project('Study', null),
      project('Math', 'Study'),
      project('Physics', 'Study'),
    ];
    expect(descendantIds('Study', projects)).toEqual(['Study', 'Math', 'Physics']);
    expect(projectMilliseconds('Study', projects, { Study: 1000, Math: 2000, Physics: 3000 })).toBe(
      6000,
    );
    expect(projectPath('Math', projects)).toBe('Study / Math');
  });
  it('inherits archive status without changing children', () => {
    const projects = [project('Study', null, true), project('Math', 'Study')];
    expect(isProjectArchived('Math', projects)).toBe(true);
    expect(projects[1].archived).toBe(false);
  });
});
