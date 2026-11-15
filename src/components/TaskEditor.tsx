import { isProjectArchived, projectPath } from '../state/projects';
import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { inputOf, type Project, type Task, type TaskInput } from '../api/client';
import { useI18n } from '../i18n';
import { Dialog } from './Dialog';
export function TaskEditor({
  task,
  projectId,
  projects,
  busy,
  confirmDelete = false,
  onClose,
  onSave,
  onDelete,
}: {
  task?: Task;
  projectId: string | null;
  projects: Project[];
  busy: boolean;
  confirmDelete?: boolean;
  onClose: () => void;
  onSave: (input: TaskInput, id?: string) => Promise<boolean>;
  onDelete: (task: Task) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [confirm, setConfirm] = useState(confirmDelete);
  const [form, setForm] = useState<TaskInput>(
    task
      ? inputOf(task)
      : {
          title: '',
          notes: '',
          scheduledDate: null,
          deadline: null,
          priority: 'none',
          completed: false,
          estimateMinutes: 0,
          revision: 0,
          projectId,
        },
  );
  const field = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await onSave({ ...form, title: form.title.trim() }, task?.id)) onClose();
  };
  return (
    <Dialog title={task ? t('task.title') : t('common.newTask')} onClose={onClose} wide busy={busy}>
      <form onSubmit={(e) => void submit(e)}>
        <label className="sr-only" htmlFor="task-title">
          {t('task.title')}
        </label>
        <input
          id="task-title"
          className="title-input"
          placeholder={t('task.titlePlaceholder')}
          required
          maxLength={300}
          value={form.title}
          onChange={(e) => field('title', e.target.value)}
          disabled={busy}
        />
        <label className="sr-only" htmlFor="task-notes">
          {t('task.notes')}
        </label>
        <textarea
          id="task-notes"
          className="notes-input"
          placeholder={t('task.notesPlaceholder')}
          maxLength={20000}
          value={form.notes}
          onChange={(e) => field('notes', e.target.value)}
          disabled={busy}
        />
        <div className="form-grid">
          <label>
            <span>{t('task.project')}</span>
            <select
              value={form.projectId ?? ''}
              onChange={(e) => field('projectId', e.target.value || null)}
              disabled={busy}
            >
              <option value="">{t('common.noProject')}</option>
              {projects
                .filter((p) => !isProjectArchived(p.id, projects) || p.id === form.projectId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {projectPath(p.id, projects)}
                    {p.archived ? ` · ${t('common.archived')}` : ''}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>{t('task.priority')}</span>
            <select
              value={form.priority}
              onChange={(e) => field('priority', e.target.value as TaskInput['priority'])}
              disabled={busy}
            >
              {(['none', 'low', 'medium', 'high'] as const).map((priority) => (
                <option key={priority} value={priority}>
                  {t(`priority.${priority}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            <span>{t('task.deadline')}</span>
            <input
              type="date"
              value={form.deadline ?? ''}
              onChange={(e) => field('deadline', e.target.value || null)}
              disabled={busy}
            />
          </label>
        </div>
        {confirm && task && (
          <div className="delete-confirm">
            <span>{t('task.deleteConfirm')}</span>
            <button
              type="button"
              className="danger-text"
              disabled={busy}
              onClick={async () => {
                if (await onDelete(task)) onClose();
              }}
            >
              {t('common.delete')}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
        <div className="dialog-footer">
          {task && (
            <button
              type="button"
              className="icon-button danger-text"
              aria-label={t('common.delete')}
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={17} />
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="button primary" disabled={busy || !form.title.trim()}>
            {busy ? t('common.saving') : task ? t('common.save') : t('task.create')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
