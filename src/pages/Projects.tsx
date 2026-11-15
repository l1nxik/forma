import { useState } from 'react';
import { SegmentedControl } from '../components/SegmentedControl';
import { FolderClosed, Plus } from 'lucide-react';
import type { Project, WorkspaceSnapshot } from '../api/client';
import { useI18n } from '../i18n';
import { ProjectCards } from '../components/ProjectCards';
import { isProjectArchived } from '../state/projects';
export function Projects({
  snapshot,
  busy,
  onNew,
  onOpen,
}: {
  snapshot: WorkspaceSnapshot;
  busy: boolean;
  onNew: () => void;
  onOpen: (project: Project) => void;
}) {
  const { t } = useI18n();
  const [archived, setArchived] = useState(false);
  const projects = snapshot.projects.filter((project) =>
    archived
      ? isProjectArchived(project.id, snapshot.projects) &&
        (!project.parentId || !isProjectArchived(project.parentId, snapshot.projects))
      : !project.parentId && !isProjectArchived(project.id, snapshot.projects),
  );
  return (
    <main className="page">
      <header className="page-heading">
        <h1>{t('nav.projects')}</h1>
        <button className="button primary" disabled={busy} onClick={onNew}>
          <Plus size={16} />
          {t('common.newProject')}
        </button>
      </header>
      <SegmentedControl
        label={t('nav.projects')}
        value={archived ? 'archived' : 'active'}
        onChange={(value) => setArchived(value === 'archived')}
        className="project-segments"
        options={[
          { value: 'active', label: t('common.active') },
          { value: 'archived', label: t('common.archived') },
        ]}
      />
      <ProjectCards
        projects={projects}
        allProjects={snapshot.projects}
        tasks={snapshot.tasks}
        times={snapshot.focus.projectMilliseconds}
        onOpen={onOpen}
      />
      {!projects.length && (
        <div className="empty-state">
          <FolderClosed size={27} />
          <h2>{t(archived ? 'common.empty' : 'project.emptyTitle')}</h2>
          {!archived && <p>{t('project.emptyBody')}</p>}
        </div>
      )}
    </main>
  );
}
