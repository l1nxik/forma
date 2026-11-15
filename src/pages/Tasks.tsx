import { useState } from 'react';
import { SegmentedControl } from '../components/SegmentedControl';
import { ArrowLeft, CheckSquare2, Pencil, Play, Plus, Search } from 'lucide-react';
import type { Project, WorkspaceSnapshot } from '../api/client';
import { useI18n } from '../i18n';
import { filterTasks, sortTasks, type TaskSort } from '../state/selectors';
import { TaskList, type TaskActions } from '../components/TaskList';
import { ProjectCards } from '../components/ProjectCards';
import { descendantIds, isProjectArchived, projectPath } from '../state/projects';
export function Tasks({
  snapshot,
  project,
  today,
  busy,
  onNew,
  onBack,
  onEditProject,
  onProjectFocus,
  onOpenProject,
  onNewSubproject,
  ...actions
}: TaskActions & {
  snapshot: WorkspaceSnapshot;
  project?: Project;
  today: string;
  busy: boolean;
  onNew: () => void;
  onBack?: () => void;
  onEditProject?: () => void;
  onProjectFocus?: () => void;
  onOpenProject?: (project: Project) => void;
  onNewSubproject?: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState(''),
    [status, setStatus] = useState<'active' | 'completed' | 'all'>('active'),
    [sort, setSort] = useState<TaskSort>('priority');
  const projectId = project?.id ?? filter;
  const scope =
    projectId && projectId !== 'none' ? new Set(descendantIds(projectId, snapshot.projects)) : null;
  const visible = sortTasks(
    filterTasks(
      scope
        ? snapshot.tasks.filter((task) => task.projectId && scope.has(task.projectId))
        : snapshot.tasks,
      query,
      scope ? '' : projectId,
      status,
    ),
    sort,
  );
  const archived = project ? isProjectArchived(project.id, snapshot.projects) : false;
  const children = project ? snapshot.projects.filter((item) => item.parentId === project.id) : [];
  const parent = project?.parentId
    ? snapshot.projects.find((item) => item.id === project.parentId)
    : undefined;
  return (
    <main className="page">
      <header className="page-heading">
        <div>
          {project && (
            <button className="back-link" onClick={onBack}>
              <ArrowLeft size={14} />
              {parent?.name ?? t('nav.projects')}
            </button>
          )}
          <h1>{project?.name ?? t('nav.tasks')}</h1>
          {project?.description && <p className="page-description">{project.description}</p>}
        </div>
        <div className="heading-actions">
          {project && (
            <>
              <button
                className="icon-button"
                aria-label={t('common.edit')}
                disabled={busy}
                onClick={onEditProject}
              >
                <Pencil size={17} />
              </button>
              <button
                className="button secondary"
                disabled={busy || archived}
                onClick={onProjectFocus}
              >
                <Play size={15} />
                {t('nav.focus')}
              </button>
            </>
          )}
          <button className="button primary" disabled={busy || archived} onClick={onNew}>
            <Plus size={16} />
            {t('common.newTask')}
          </button>
        </div>
      </header>
      {archived && <div className="notice">{t('project.archiveNotice')}</div>}
      {project && (!project.parentId || children.length > 0) && (
        <section className="subprojects-section">
          <div className="section-heading">
            <h2>{t('project.subprojects')}</h2>
            <button
              className="button secondary compact"
              disabled={busy || archived}
              onClick={onNewSubproject}
            >
              <Plus size={14} />
              {t('project.newSubproject')}
            </button>
          </div>
          <ProjectCards
            projects={children}
            allProjects={snapshot.projects}
            tasks={snapshot.tasks}
            times={snapshot.focus.projectMilliseconds}
            onOpen={(item) => onOpenProject?.(item)}
          />
        </section>
      )}
      <SegmentedControl
        label={t('task.filter')}
        value={status}
        onChange={setStatus}
        className="task-status-tabs"
        options={(['active', 'completed', 'all'] as const).map((value) => ({
          value,
          label: t(`common.${value}`),
        }))}
      />
      <div className="tasks-toolbar">
        <label className="inline-search">
          <Search size={15} />
          <input
            aria-label={t('common.search')}
            placeholder={t('common.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {!project && (
          <select
            aria-label={t('task.project')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">{t('common.all')}</option>
            <option value="none">{t('common.noProject')}</option>
            {snapshot.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {projectPath(p.id, snapshot.projects)}
                {p.archived ? ` · ${t('common.archived')}` : ''}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label={t('task.sort')}
          value={sort}
          onChange={(e) => setSort(e.target.value as TaskSort)}
        >
          <option value="priority">{t('task.sortPriority')}</option>
          <option value="deadline">{t('task.sortDeadline')}</option>
          <option value="created">{t('task.sortCreated')}</option>
        </select>
      </div>
      <TaskList
        tasks={visible}
        projects={snapshot.projects}
        tracked={snapshot.focus.taskMilliseconds}
        today={today}
        busy={busy}
        {...actions}
        empty={
          <div className="empty-state">
            <CheckSquare2 size={32} />
            <h2>{t(snapshot.tasks.length ? 'task.noResults' : 'task.noTasks')}</h2>
            {!snapshot.tasks.length && (
              <>
                <p>{t('task.noTasksBody')}</p>
              </>
            )}
          </div>
        }
      />
    </main>
  );
}
