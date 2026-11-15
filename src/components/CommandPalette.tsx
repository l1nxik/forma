import { useState } from 'react';
import { Search, Plus, Sun, CheckSquare2, FolderClosed, Timer, ArrowUpLeft } from 'lucide-react';
import { Dialog } from './Dialog';
import { useI18n } from '../i18n';
import type { Project, Task, View } from '../api/client';
export function CommandPalette({
  tasks,
  projects,
  onClose,
  onNew,
  onOpen,
  onProject,
  onView,
}: {
  tasks: Task[];
  projects: Project[];
  onClose: () => void;
  onNew: () => void;
  onOpen: (task: Task) => void;
  onProject: (project: Project) => void;
  onView: (view: View) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState(''),
    [index, setIndex] = useState(0);
  const actions = [
    { label: t('common.newTask'), icon: Plus, action: onNew },
    { label: t('nav.today'), icon: Sun, action: () => onView('today') },
    { label: t('nav.tasks'), icon: CheckSquare2, action: () => onView('tasks') },
    { label: t('nav.projects'), icon: FolderClosed, action: () => onView('projects') },
    { label: t('nav.focus'), icon: Timer, action: () => onView('focus') },
  ].filter((action) => action.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const matches = query.trim()
    ? tasks
        .filter((task) =>
          `${task.title} ${task.notes}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
        )
        .slice(0, 12)
    : [];
  const projectMatches = query.trim()
    ? projects
        .filter((project) =>
          project.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
        )
        .slice(0, 5)
    : [];
  const items = [
    ...actions,
    ...projectMatches.map((project) => ({
      label: project.name,
      icon: FolderClosed,
      action: () => onProject(project),
    })),
    ...matches.map((task) => ({
      label: task.title,
      icon: ArrowUpLeft,
      action: () => onOpen(task),
    })),
  ];
  return (
    <Dialog title={t('command.title')} onClose={onClose}>
      <div className="command-search">
        <Search size={18} />
        <input
          aria-label={t('common.search')}
          placeholder={t('command.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setIndex((i) => (i + 1) % Math.max(items.length, 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setIndex((i) => (i + items.length - 1) % Math.max(items.length, 1));
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              items[index]?.action();
            }
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div className="command-results" role="listbox" aria-label={t('command.title')}>
        {items.map((item, i) => (
          <button
            key={`${i}-${item.label}`}
            role="option"
            aria-selected={i === index}
            className={i === index ? 'selected' : ''}
            onMouseEnter={() => setIndex(i)}
            onClick={item.action}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
            {i === index && <kbd>↵</kbd>}
          </button>
        ))}
        {!items.length && <p>{t('command.empty')}</p>}
      </div>
      <div className="command-footer">{t('command.hint')}</div>
    </Dialog>
  );
}
