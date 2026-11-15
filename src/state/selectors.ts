import { localDate } from './dates';
import type { Task } from '../api/client';
export type TaskSort = 'priority' | 'deadline' | 'created';
export function sortTasks(tasks: Task[], sort: TaskSort = 'priority'): Task[] {
  const priority = { high: 3, medium: 2, low: 1, none: 0 };
  return [...tasks].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      (sort === 'priority'
        ? priority[b.priority] - priority[a.priority]
        : sort === 'deadline'
          ? (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999')
          : 0) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}
export function planTasks(tasks: Task[], ids: string[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return ids.flatMap((id) => {
    const task = byId.get(id);
    return task ? [task] : [];
  });
}
export function filterTasks(
  tasks: Task[],
  query: string,
  project: string,
  status: 'active' | 'completed' | 'all',
): Task[] {
  const search = query.trim().toLocaleLowerCase();
  return tasks.filter(
    (t) =>
      (status === 'all' || t.completed === (status === 'completed')) &&
      (!project || (project === 'none' ? !t.projectId : t.projectId === project)) &&
      `${t.title} ${t.notes}`.toLocaleLowerCase().includes(search),
  );
}

export function completedOn(tasks: Task[], date: string): Task[] {
  return tasks
    .filter(
      (task) =>
        task.completed && task.completedAt && localDate(new Date(task.completedAt)) === date,
    )
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}
