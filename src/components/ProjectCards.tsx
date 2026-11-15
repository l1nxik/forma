import { ChevronRight, FolderClosed } from 'lucide-react';
import type { Project, Task } from '../api/client';
import { useI18n } from '../i18n';
import { descendantIds, projectMilliseconds, projectPath } from '../state/projects';
export function ProjectCards({
  projects,
  allProjects,
  tasks,
  times,
  onOpen,
}: {
  projects: Project[];
  allProjects: Project[];
  tasks: Task[];
  times: Record<string, number>;
  onOpen: (project: Project) => void;
}) {
  const { t, duration } = useI18n();
  return (
    <div className="project-list">
      {projects.map((project) => {
        const ids = new Set(descendantIds(project.id, allProjects));
        const items = tasks.filter((task) => task.projectId && ids.has(task.projectId));
        const done = items.filter((task) => task.completed).length,
          time = projectMilliseconds(project.id, allProjects, times);
        return (
          <button className="project-list-row" key={project.id} onClick={() => onOpen(project)}>
            <span className={`project-symbol color-${project.color}`}>
              <FolderClosed size={19} />
            </span>
            <span className="project-row-copy">
              <strong>{project.name}</strong>
              {project.description ? (
                <small>{project.description}</small>
              ) : project.parentId ? (
                <small>{projectPath(project.parentId, allProjects)}</small>
              ) : null}
            </span>
            <span className="project-row-stats">
              <span>{t('project.progress', { done, total: items.length })}</span>
              {time > 0 && <small>{duration(time)}</small>}
            </span>
            <ChevronRight size={15} />
          </button>
        );
      })}
    </div>
  );
}
