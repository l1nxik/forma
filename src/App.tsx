import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { AlertCircle, ArrowLeft, ArrowRight, PanelLeft, RefreshCw, X } from 'lucide-react';
import { useWorkspace, type AppData } from './state/useWorkspace';
import { FeedbackProvider } from './state/Feedback';
import { localDate } from './state/dates';
import { isProjectArchived } from './state/projects';
import {
  inputOf,
  type Task,
  type TaskInput,
  type Project,
  type ProjectInput,
  type View,
} from './api/client';
import { I18nProvider, errorText, useI18n } from './i18n';
import { Startup } from './components/Startup';
import { useAppShortcuts } from './state/useAppShortcuts';
import { useNavigationHistory } from './state/useNavigationHistory';
import type { AppLocation } from './state/navigation';
import { Sidebar } from './components/Sidebar';
import { TaskEditor } from './components/TaskEditor';
import { ProjectEditor } from './components/ProjectEditor';
import { PlanEditor } from './components/PlanEditor';
import { Settings } from './components/Settings';
import { CommandPalette } from './components/CommandPalette';
import { TaskMenu } from './components/TaskMenu';
import { Today } from './pages/Today';
import { Tasks } from './pages/Tasks';
import { Projects } from './pages/Projects';
import { Focus } from './pages/Focus';
import { useSidebarGlass } from './design/useSidebarGlass';
import { commandKey, sidebarShortcut } from './design/platform';
export default function App() {
  const [today, setToday] = useState(localDate()),
    [date, setDate] = useState(localDate());
  const lastDay = useRef(today);
  useEffect(() => {
    const interval = setInterval(() => {
      const current = localDate();
      if (current !== lastDay.current) {
        const previous = lastDay.current;
        lastDay.current = current;
        setToday(current);
        setDate((value) => (value === previous ? current : value));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  const data = useWorkspace(date);
  return (
    <I18nProvider language={data.preferences.language}>
      <MotionConfig reducedMotion="user">
        <WorkspaceApp data={data} today={today} date={date} onDate={setDate} />
      </MotionConfig>
    </I18nProvider>
  );
}
function WorkspaceApp({
  data,
  today,
  date,
  onDate,
}: {
  data: AppData;
  today: string;
  date: string;
  onDate: (date: string) => void;
}) {
  const { t, language } = useI18n();
  const history = useNavigationHistory(date);
  const { view, projectId: selectedProject } = history.current;
  useEffect(() => {
    history.syncDate(date);
  }, [date]);
  const [editor, setEditor] = useState<{ task?: Task; confirmDelete?: boolean } | null>(null),
    [projectEditor, setProjectEditor] = useState<{
      project?: Project;
      parentId?: string | null;
    } | null>(null),
    [planEditor, setPlanEditor] = useState(false),
    [settings, setSettings] = useState(false),
    [search, setSearch] = useState(false),
    [menu, setMenu] = useState<{ task: Task; x: number; y: number } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    data.preferences.sidebarCollapsed === 'true',
  );
  useEffect(
    () => setSidebarCollapsed(data.preferences.sidebarCollapsed === 'true'),
    [data.preferences.sidebarCollapsed],
  );
  const toggleSidebar = async () => {
    const collapsed = !sidebarCollapsed;
    setSidebarCollapsed(collapsed);
    if (!(await data.mutate('savePreferences', { body: { sidebarCollapsed: String(collapsed) } })))
      setSidebarCollapsed(!collapsed);
  };
  const closeMenu = useCallback(() => setMenu(null), []);
  const snapshot = data.snapshot;
  useSidebarGlass(!!snapshot);
  const busy = data.pending || data.loading;
  const project = snapshot?.projects.find((item) => item.id === selectedProject);
  const visit = (location: AppLocation) => {
    history.visit(location);
    onDate(location.date);
    setSearch(false);
    setMenu(null);
  };
  const navigate = (next: View) => visit({ view: next, projectId: null, date: today });
  const changeDate = (next: string) => visit({ ...history.current, date: next });
  const moveThroughHistory = (direction: -1 | 1) => {
    const location = history.move(direction);
    if (location) {
      onDate(location.date);
      setSearch(false);
      setMenu(null);
    }
  };
  const newTask = () => {
    if (!busy && snapshot) {
      setSearch(false);
      setEditor({});
    }
  };
  const openTask = (task: Task) => {
    setSearch(false);
    setMenu(null);
    setEditor({ task });
  };
  const openProject = (item: Project) => {
    visit({ view: 'projects', projectId: item.id, date });
  };
  const startTask = async (task: Task) => {
    setMenu(null);
    if (snapshot?.focus.active) {
      navigate('focus');
      if (snapshot.focus.active.taskId !== task.id) data.setError('focus.active');
      return;
    }
    if (await data.mutate('startFocus', { body: { kind: 'work', taskId: task.id } }))
      navigate('focus');
  };
  useAppShortcuts({
    ready: data.ready,
    busy: data.pending,
    onToggleSidebar: () => void toggleSidebar(),
    onNew: newTask,
    onSearch: () => setSearch((value) => !value),
    onSettings: () => setSettings((value) => !value),
    onView: navigate,
    onBack: () => moveThroughHistory(-1),
    onForward: () => moveThroughHistory(1),
  });
  if (!data.ready || !snapshot) return <Startup data={data} />;
  const taskActions = {
    onOpen: openTask,
    onToggle: (task: Task) =>
      void data.mutate('update', {
        id: task.id,
        body: { ...inputOf(task), completed: !task.completed },
      }),
    onMenu: (task: Task, x: number, y: number) => setMenu({ task, x, y }),
    onFocus: (task: Task) => void startTask(task),
  };
  const saveTask = async (input: TaskInput, id?: string) =>
    !!(await data.mutate<Task>(id ? 'update' : 'create', { id, body: input }));
  const saveProject = async (input: ProjectInput, id?: string) => {
    const result = await data.mutate<Project>(id ? 'updateProject' : 'createProject', {
      id,
      body: input,
    });
    if (result && !id) openProject(result);
    return !!result;
  };
  const pause = () => {
    const active = snapshot.focus.active;
    if (active)
      void data.mutate(active.state === 'running' ? 'pauseFocus' : 'resumeFocus', {
        id: active.id,
        body: { revision: active.revision },
      });
  };
  const feedback = {
    message: data.error ? errorText(data.error, language) : null,
    onDismiss: () => data.setError(null),
    onRefresh: () => void data.refresh(),
  };
  return (
    <FeedbackProvider value={feedback}>
      <div className="app-shell">
        <header className="window-toolbar" data-tauri-drag-region>
          <div className="toolbar-navigation">
            <button
              className="toolbar-button"
              aria-label={t('nav.back')}
              title={`${t('nav.back')} ${commandKey}[`}
              disabled={busy || !history.canGoBack}
              onClick={() => moveThroughHistory(-1)}
            >
              <ArrowLeft size={19} strokeWidth={1.7} />
            </button>
            <button
              className="toolbar-button"
              aria-label={t('nav.forward')}
              title={`${t('nav.forward')} ${commandKey}]`}
              disabled={busy || !history.canGoForward}
              onClick={() => moveThroughHistory(1)}
            >
              <ArrowRight size={19} strokeWidth={1.7} />
            </button>
          </div>
          <button
            className="toolbar-button"
            aria-label={t('nav.toggleSidebar')}
            title={`${t('nav.toggleSidebar')} ${sidebarShortcut}`}
            aria-expanded={!sidebarCollapsed}
            onClick={() => void toggleSidebar()}
            disabled={data.pending}
          >
            <PanelLeft size={20} strokeWidth={1.7} />
          </button>
          <span className="spacer" />
          {data.pending && (
            <span className="saving-indicator" role="status">
              {t('common.saving')}
            </span>
          )}
        </header>
        <div className="workspace-body">
          <Sidebar
            compact={sidebarCollapsed}
            view={view}
            onView={navigate}
            onSearch={() => setSearch(true)}
            onSettings={() => setSettings(true)}
            counts={{
              today: snapshot.tasks.filter(
                (task) => snapshot.plan.taskIds.includes(task.id) && !task.completed,
              ).length,
              tasks: snapshot.tasks.filter((task) => !task.completed).length,
            }}
            session={snapshot.focus.active}
            receivedAt={data.receivedAt}
            onPause={pause}
            busy={busy}
            projects={snapshot.projects}
            selectedProject={view === 'projects' ? selectedProject : null}
            onProject={openProject}
          />
          <div className="content-shell">
            <div className="page-scroll" aria-busy={data.loading}>
              {view === 'today' && (
                <Today
                  snapshot={snapshot}
                  date={date}
                  today={today}
                  busy={busy}
                  receivedAt={data.receivedAt}
                  onDate={changeDate}
                  onPlan={() => setPlanEditor(true)}
                  onNew={newTask}
                  {...taskActions}
                />
              )}
              {view === 'tasks' && (
                <Tasks
                  key="all"
                  snapshot={snapshot}
                  today={today}
                  busy={busy}
                  onNew={newTask}
                  onBack={() => navigate('projects')}
                  {...taskActions}
                />
              )}
              {view === 'projects' &&
                (project ? (
                  <Tasks
                    key={project.id}
                    snapshot={snapshot}
                    project={project}
                    today={today}
                    busy={busy}
                    onNew={newTask}
                    onBack={() => visit({ view: 'projects', projectId: project.parentId, date })}
                    onOpenProject={openProject}
                    onNewSubproject={() => setProjectEditor({ parentId: project.id })}
                    onEditProject={() => setProjectEditor({ project })}
                    onProjectFocus={async () => {
                      if (
                        await data.mutate('startFocus', {
                          body: { kind: 'work', projectId: project.id },
                        })
                      )
                        navigate('focus');
                    }}
                    {...taskActions}
                  />
                ) : (
                  <Projects
                    snapshot={snapshot}
                    busy={busy}
                    onNew={() => setProjectEditor({})}
                    onOpen={openProject}
                  />
                ))}
              {view === 'focus' && <Focus data={data} today={today} />}
            </div>
          </div>
        </div>
        {data.error && !document.querySelector('dialog[open]') && (
          <div className="error-toast" role="alert">
            <AlertCircle size={18} />
            <span>{feedback.message}</span>
            <button
              aria-label={t('common.retry')}
              disabled={data.pending}
              onClick={feedback.onRefresh}
            >
              <RefreshCw size={16} />
            </button>
            <button aria-label={t('common.close')} onClick={feedback.onDismiss}>
              <X size={16} />
            </button>
          </div>
        )}
        {editor && (
          <TaskEditor
            task={editor.task}
            projectId={
              view === 'projects' && project && !isProjectArchived(project.id, snapshot.projects)
                ? project.id
                : null
            }
            confirmDelete={editor.confirmDelete}
            projects={snapshot.projects}
            busy={data.pending}
            onClose={() => setEditor(null)}
            onSave={saveTask}
            onDelete={async (task) =>
              !!(await data.mutate('delete', { id: task.id, revision: task.revision }))
            }
          />
        )}
        {projectEditor && (
          <ProjectEditor
            project={projectEditor.project}
            parentId={projectEditor.parentId}
            projects={snapshot.projects}
            busy={data.pending}
            onClose={() => setProjectEditor(null)}
            onSave={saveProject}
          />
        )}
        {planEditor && (
          <PlanEditor
            workspace={data.workspace}
            plan={snapshot.plan}
            tasks={snapshot.tasks}
            projects={snapshot.projects}
            busy={data.pending}
            onClose={() => setPlanEditor(false)}
            onError={data.setError}
            onSave={async (ids, revision) =>
              !!(await data.mutate('savePlan', { date, body: { revision, taskIds: ids } }))
            }
          />
        )}
        {settings && <Settings data={data} onClose={() => setSettings(false)} />}
        {search && (
          <CommandPalette
            tasks={snapshot.tasks}
            projects={snapshot.projects}
            onClose={() => setSearch(false)}
            onNew={newTask}
            onOpen={openTask}
            onProject={openProject}
            onView={navigate}
          />
        )}
        {menu && (
          <TaskMenu
            {...menu}
            inPlan={snapshot.plan.taskIds.includes(menu.task.id)}
            onClose={closeMenu}
            onOpen={() => openTask(menu.task)}
            onDelete={() => {
              setEditor({ task: menu.task, confirmDelete: true });
              setMenu(null);
            }}
            onFocus={() => void startTask(menu.task)}
            onPlan={() => {
              const ids = snapshot.plan.taskIds.includes(menu.task.id)
                ? snapshot.plan.taskIds.filter((id) => id !== menu.task.id)
                : [...snapshot.plan.taskIds, menu.task.id];
              void data.mutate('savePlan', {
                date,
                body: { revision: snapshot.plan.revision, taskIds: ids },
              });
              setMenu(null);
            }}
          />
        )}
      </div>
    </FeedbackProvider>
  );
}
