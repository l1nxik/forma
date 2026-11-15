import { useId, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Project } from '../api/client';
import { isProjectArchived } from '../state/projects';
import { useI18n } from '../i18n';

export function ProjectNavigation({
  projects,
  selected,
  onOpen,
}: {
  projects: Project[];
  selected: string | null;
  onOpen: (project: Project) => void;
}) {
  const { t } = useI18n();
  const active = projects.filter((project) => !isProjectArchived(project.id, projects));
  const roots = active.filter((project) => !project.parentId);
  if (!roots.length) return null;
  return (
    <section className="sidebar-projects" aria-label={t('nav.projects')}>
      <h2 className="sidebar-projects-heading">{t('nav.projects')}</h2>
      {roots.map((project) => (
        <ProjectBranch
          key={project.id}
          project={project}
          projects={active}
          selected={selected}
          onOpen={onOpen}
        />
      ))}
    </section>
  );
}

function ProjectBranch({
  project,
  projects,
  selected,
  onOpen,
}: {
  project: Project;
  projects: Project[];
  selected: string | null;
  onOpen: (project: Project) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const id = useId();
  const children = projects.filter((item) => item.parentId === project.id);
  return (
    <div>
      <div className="sidebar-project-row">
        {children.length > 0 && (
          <button
            className="icon-button"
            aria-label={project.name}
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
        <button
          onClick={() => onOpen(project)}
          title={project.name}
          aria-current={selected === project.id ? 'page' : undefined}
        >
          <i className={`project-dot color-${project.color}`} />
          <span>{project.name}</span>
        </button>
      </div>
      {expanded && children.length > 0 && (
        <div className="sidebar-project-children" id={id}>
          {children.map((child) => (
            <ProjectBranch
              key={child.id}
              project={child}
              projects={projects}
              selected={selected}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
