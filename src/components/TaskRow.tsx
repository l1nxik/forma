import { Check, MoreHorizontal, Flag, Play, AlignLeft } from 'lucide-react';
import { motion } from 'motion/react';
import type { Task, Project } from '../api/client';
import { useI18n } from '../i18n';
export function TaskRow({
  task,
  project,
  today,
  busy,
  onToggle,
  onOpen,
  onMenu,
  onFocus,
  tracked = 0,
}: {
  task: Task;
  project?: Project;
  today: string;
  busy: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onMenu: (x: number, y: number) => void;
  onFocus: () => void;
  tracked?: number;
}) {
  const { t, date, duration } = useI18n();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className={`task-row ${task.completed ? 'is-completed' : ''}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e.clientX, e.clientY);
      }}
    >
      <button
        className={`task-checkbox priority-${task.priority}`}
        aria-label={t(task.completed ? 'task.reopen' : 'task.complete', { title: task.title })}
        aria-pressed={task.completed}
        disabled={busy}
        onClick={onToggle}
      >
        {task.completed && <Check size={12} strokeWidth={3} />}
      </button>
      <button className="task-content" onClick={onOpen} disabled={busy}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          {project && (
            <span>
              <i className={`project-dot color-${project.color}`} />
              {project.name}
            </span>
          )}
          {task.deadline && (
            <span className={!task.completed && task.deadline < today ? 'overdue-label' : ''}>
              <Flag size={11} />
              {task.deadline === today
                ? t('task.dueToday')
                : date(task.deadline, { day: 'numeric', month: 'short' })}
            </span>
          )}
          {task.notes && <AlignLeft size={12} aria-label={t('task.notes')} />}
          {tracked > 0 && <span>{duration(tracked)}</span>}
        </span>
      </button>
      <div className="row-actions">
        {!task.completed && (
          <button
            className="icon-button"
            aria-label={t('focus.start')}
            disabled={busy || project?.archived}
            onClick={onFocus}
          >
            <Play size={14} />
          </button>
        )}
        <button
          className="icon-button"
          aria-label={t('task.actions', { title: task.title })}
          disabled={busy}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onMenu(r.right, r.bottom);
          }}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </motion.div>
  );
}
