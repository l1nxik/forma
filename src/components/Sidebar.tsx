import {
  Sun,
  CheckSquare2,
  FolderClosed,
  Timer,
  Search,
  Settings2,
  Play,
  Pause,
} from 'lucide-react';
import type { FocusSession, View, Project } from '../api/client';
import { useI18n, elapsedClock } from '../i18n';
import { useElapsed } from '../state/useElapsed';
import { Logo } from './Logo';
import { ProjectNavigation } from './ProjectNavigation';
import { commandKey } from '../design/platform';
export function Sidebar({
  view,
  compact,
  onView,
  onSearch,
  onSettings,
  counts,
  session,
  receivedAt,
  onPause,
  busy,
  projects,
  selectedProject,
  onProject,
}: {
  view: View;
  compact: boolean;
  onView: (view: View) => void;
  onSearch: () => void;
  onSettings: () => void;
  counts: { today: number; tasks: number };
  session: FocusSession | null;
  receivedAt: number;
  onPause: () => void;
  busy: boolean;
  projects: Project[];
  selectedProject: string | null;
  onProject: (project: Project) => void;
}) {
  const { t } = useI18n();
  const elapsed = useElapsed(compact ? null : session, receivedAt);
  const links = [
    { id: 'today', icon: Sun, count: counts.today },
    { id: 'tasks', icon: CheckSquare2, count: counts.tasks },
    { id: 'projects', icon: FolderClosed, count: 0 },
    { id: 'focus', icon: Timer, count: 0 },
  ] as const;
  return (
    <aside className={`sidebar ${compact ? 'sidebar-compact' : ''}`} aria-label="Forma">
      <div className="brand">
        <Logo />
        <span>Forma</span>
      </div>
      <button
        className="sidebar-search"
        onClick={onSearch}
        aria-label={t('common.search')}
        title={`${t('common.search')} ${commandKey}K`}
      >
        <Search size={16} />
        <span>{t('common.search')}</span>
        <kbd>{commandKey}K</kbd>
      </button>
      <nav aria-label="Forma">
        {links.map((item) => (
          <button
            key={item.id}
            aria-label={t(`nav.${item.id}`)}
            title={t(`nav.${item.id}`)}
            className={`nav-item ${view === item.id && (compact || !(item.id === 'projects' && selectedProject)) ? 'active' : ''}`}
            aria-current={
              view === item.id && (compact || !(item.id === 'projects' && selectedProject))
                ? 'page'
                : undefined
            }
            onClick={() => onView(item.id)}
          >
            <item.icon size={18} strokeWidth={1.8} />
            {compact && item.id === 'focus' && session && (
              <i
                aria-hidden="true"
                className={`pulse-dot compact-focus-indicator ${session.state === 'paused' ? 'paused' : ''}`}
              />
            )}
            <span>{t(`nav.${item.id}`)}</span>
            {item.count > 0 && <span className="nav-count">{item.count}</span>}
          </button>
        ))}
      </nav>
      <ProjectNavigation projects={projects} selected={selectedProject} onOpen={onProject} />
      <div className="sidebar-bottom">
        {session && (
          <div className="mini-focus">
            <button className="mini-focus-body" onClick={() => onView('focus')}>
              <span className={`pulse-dot ${session.state === 'paused' ? 'paused' : ''}`} />
              <span>
                {session.kind === 'break'
                  ? t('focus.breakTitle')
                  : session.label === 'Focus' && !session.taskId && !session.projectId
                    ? t('focus.general')
                    : session.label}
              </span>
              <strong>
                {elapsedClock(
                  session.kind === 'break'
                    ? Math.max(0, (session.targetSeconds ?? 0) * 1000 - elapsed)
                    : elapsed,
                )}
              </strong>
            </button>
            <button
              className="icon-button"
              aria-label={session.state === 'running' ? t('focus.pause') : t('focus.resume')}
              onClick={onPause}
              disabled={busy}
            >
              {session.state === 'running' ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </div>
        )}
        <button
          className="settings-nav"
          onClick={onSettings}
          aria-label={t('nav.settings')}
          title={`${t('nav.settings')} ${commandKey},`}
        >
          <Settings2 size={18} />
          <span>{t('nav.settings')}</span>
          <kbd>{commandKey},</kbd>
        </button>
      </div>
    </aside>
  );
}
