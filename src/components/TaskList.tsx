import { useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Task, Project } from '../api/client';
import { useI18n } from '../i18n';
import { TaskRow } from './TaskRow';
export interface TaskActions {
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onMenu: (task: Task, x: number, y: number) => void;
  onFocus: (task: Task) => void;
}
export function TaskList({
  tasks,
  projects,
  today,
  busy,
  tracked,
  empty,
  completedLabel,
  ...actions
}: TaskActions & {
  tasks: Task[];
  projects: Project[];
  today: string;
  busy: boolean;
  tracked: Record<string, number>;
  empty?: ReactNode;
  completedLabel?: string;
}) {
  const { t } = useI18n();
  const [showCompleted, setShowCompleted] = useState(true);
  const active = tasks.filter((task) => !task.completed),
    completed = tasks.filter((task) => task.completed);
  const row = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      project={projects.find((project) => project.id === task.projectId)}
      today={today}
      busy={busy}
      tracked={tracked[task.id] ?? 0}
      onOpen={() => actions.onOpen(task)}
      onToggle={() => actions.onToggle(task)}
      onMenu={(x, y) => actions.onMenu(task, x, y)}
      onFocus={() => actions.onFocus(task)}
    />
  );
  if (!tasks.length) return <>{empty}</>;
  return (
    <div className="task-list">
      <AnimatePresence initial={false}>{active.map(row)}</AnimatePresence>
      {completed.length > 0 && (
        <div className="completed-group">
          <button
            className="completed-heading"
            aria-expanded={showCompleted}
            onClick={() => setShowCompleted((value) => !value)}
          >
            {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{' '}
            {completedLabel ?? t('common.completed')}
            <span>{completed.length}</span>
          </button>
          <AnimatePresence initial={false}>{showCompleted && completed.map(row)}</AnimatePresence>
        </div>
      )}
    </div>
  );
}
