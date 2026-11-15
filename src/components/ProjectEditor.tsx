import { useState, type FormEvent } from 'react';
import { Archive, ArchiveRestore, Check } from 'lucide-react';
import type { Project, ProjectInput } from '../api/client';
import { useI18n } from '../i18n';
import { descendantIds, isProjectArchived, projectPath } from '../state/projects';
import { Dialog } from './Dialog';
const colors = ['blue', 'violet', 'green', 'amber', 'rose', 'teal', 'slate'] as const;
export function ProjectEditor({
  project,
  projects,
  parentId = null,
  busy,
  onClose,
  onSave,
}: {
  project?: Project;
  projects: Project[];
  parentId?: string | null;
  busy: boolean;
  onClose: () => void;
  onSave: (input: ProjectInput, id?: string) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<ProjectInput>(
    project
      ? {
          name: project.name,
          description: project.description,
          color: project.color,
          archived: project.archived,
          revision: project.revision,
          parentId: project.parentId,
        }
      : { name: '', description: '', color: 'blue', archived: false, revision: 0, parentId },
  );
  const excluded = new Set(project ? descendantIds(project.id, projects) : []);
  const parents = projects.filter(
    (candidate) =>
      !excluded.has(candidate.id) &&
      (!isProjectArchived(candidate.id, projects) || candidate.id === form.parentId),
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await onSave({ ...form, name: form.name.trim() }, project?.id)) onClose();
  };
  return (
    <Dialog
      title={
        project
          ? t('common.edit')
          : form.parentId
            ? t('project.newSubproject')
            : t('common.newProject')
      }
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={(e) => void submit(e)}>
        <label className="sr-only" htmlFor="project-name">
          {t('project.name')}
        </label>
        <input
          id="project-name"
          className="title-input"
          placeholder={t('project.placeholder')}
          value={form.name}
          required
          maxLength={120}
          disabled={busy}
          onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
        />
        <label className="sr-only" htmlFor="project-description">
          {t('project.description')}
        </label>
        <textarea
          id="project-description"
          className="notes-input"
          placeholder={t('project.description')}
          maxLength={10000}
          disabled={busy}
          value={form.description}
          onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
        />
        <div className="form-grid">
          <label className="full-width">
            <span>{t('project.parent')}</span>
            <select
              value={form.parentId ?? ''}
              disabled={busy}
              onChange={(e) =>
                setForm((current) => ({ ...current, parentId: e.target.value || null }))
              }
            >
              <option value="">{t('project.topLevel')}</option>
              {parents.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {projectPath(candidate.id, projects)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="small-label">{t('project.color')}</div>
        <div className="color-options">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={t(`color.${color}`)}
              aria-pressed={form.color === color}
              className={`color-option color-${color}`}
              disabled={busy}
              onClick={() => setForm((current) => ({ ...current, color }))}
            >
              {form.color === color && <Check size={14} />}
            </button>
          ))}
        </div>
        {project && (
          <button
            type="button"
            className="archive-toggle"
            aria-pressed={form.archived}
            disabled={busy}
            onClick={() => setForm((current) => ({ ...current, archived: !current.archived }))}
          >
            {form.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}{' '}
            {t(form.archived ? 'project.restore' : 'project.archive')}
          </button>
        )}
        <div className="dialog-footer">
          <span className="spacer" />
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="button primary" disabled={busy || !form.name.trim()}>
            {t(busy ? 'common.saving' : project ? 'common.save' : 'project.create')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
