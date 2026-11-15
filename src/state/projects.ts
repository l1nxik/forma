import type { Project } from '../api/client';
export function descendantIds(id: string, projects: Project[]): string[] {
  const result: string[] = [];
  const pending = [id];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    pending.push(
      ...projects.filter((project) => project.parentId === current).map((project) => project.id),
    );
  }
  return result;
}
export function projectPath(id: string, projects: Project[]): string {
  const names: string[] = [];
  const visited = new Set<string>();
  let current: string | null = id;
  while (current && !visited.has(current)) {
    visited.add(current);
    const project = projects.find((item) => item.id === current);
    if (!project) break;
    names.unshift(project.name);
    current = project.parentId;
  }
  return names.join(' / ');
}
export function isProjectArchived(id: string | null, projects: Project[]): boolean {
  const visited = new Set<string>();
  let current = id;
  while (current && !visited.has(current)) {
    visited.add(current);
    const project = projects.find((item) => item.id === current);
    if (!project) break;
    if (project.archived) return true;
    current = project.parentId;
  }
  return false;
}
export function projectMilliseconds(
  id: string,
  projects: Project[],
  times: Record<string, number>,
): number {
  return descendantIds(id, projects).reduce((total, current) => total + (times[current] ?? 0), 0);
}
