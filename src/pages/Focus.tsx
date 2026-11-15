import { descendantIds, isProjectArchived, projectPath } from '../state/projects';
import { useEffect, useState } from 'react';
import { SegmentedControl } from '../components/SegmentedControl';
import { Coffee, Pause, Play, Square } from 'lucide-react';
import type { AppData } from '../state/useWorkspace';
import type { FocusSession } from '../api/client';
import { useI18n, elapsedClock } from '../i18n';
import { useElapsed } from '../state/useElapsed';
import { SessionHistory } from '../components/focus/SessionHistory';
import { SessionEditor } from '../components/focus/SessionEditor';
import { Statistics } from '../components/focus/Statistics';
export function Focus({ data, today }: { data: AppData; today: string }) {
  const { t, duration } = useI18n();
  const snapshot = data.snapshot!;
  const session = snapshot.focus.active;
  const [tab, setTab] = useState<'timer' | 'statistics'>('timer'),
    [project, setProject] = useState(''),
    [task, setTask] = useState(''),
    [editing, setEditing] = useState<FocusSession | null>(null),
    [breakMinutes, setBreakMinutes] = useState(Number(data.preferences.breakMinutes));
  useEffect(
    () => setBreakMinutes(Number(data.preferences.breakMinutes)),
    [data.preferences.breakMinutes],
  );
  const elapsed = useElapsed(session, data.receivedAt);
  const total =
    snapshot.dayStatistics.totalMilliseconds +
    (session?.kind === 'work' ? Math.max(0, elapsed - session.elapsedMilliseconds) : 0);
  const goal = Number(data.preferences.dailyGoalMinutes) * 60000;
  const activeProjects = snapshot.projects.filter(
      (p) => !isProjectArchived(p.id, snapshot.projects) || p.id === session?.projectId,
    ),
    available = snapshot.tasks.filter(
      (item) =>
        !item.completed &&
        (!project || descendantIds(project, snapshot.projects).includes(item.projectId ?? '')) &&
        !isProjectArchived(item.projectId, snapshot.projects),
    );
  const start = async () => {
    const selected = snapshot.tasks.find((item) => item.id === task);
    await data.mutate('startFocus', {
      body: {
        kind: 'work',
        taskId: task || null,
        projectId: selected?.projectId ?? (project || null),
      },
    });
  };
  const action = async (value: 'pause' | 'resume' | 'stop') => {
    if (session)
      await data.mutate(`${value}Focus`, { id: session.id, body: { revision: session.revision } });
  };
  const countdown =
    session?.kind === 'break'
      ? Math.max(0, (session.targetSeconds ?? 0) * 1000 - elapsed)
      : elapsed;
  useEffect(() => {
    if (
      session?.kind === 'break' &&
      session.state === 'running' &&
      countdown === 0 &&
      !data.pending
    )
      void data.refresh();
  }, [session, countdown, data.pending, data.refresh]);
  const label =
    session?.kind === 'break'
      ? t('focus.breakTitle')
      : session?.label === 'Focus' && !session.projectId && !session.taskId
        ? t('focus.general')
        : (session?.label ?? t('focus.general'));
  return (
    <main className="page focus-page">
      <header className="page-heading">
        <h1>{t('nav.focus')}</h1>
        <SegmentedControl
          label={t('nav.focus')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'timer', label: t('focus.timer') },
            { value: 'statistics', label: t('focus.statistics') },
          ]}
        />
      </header>
      {tab === 'timer' ? (
        <>
          <section className={`focus-panel ${session?.kind === 'break' ? 'break-panel' : ''}`}>
            <div className="focus-main">
              <div className="focus-status">
                <span
                  className={`pulse-dot ${!session || session.state === 'paused' ? 'paused' : ''}`}
                />
                {session
                  ? t(
                      session.state === 'paused'
                        ? 'focus.paused'
                        : session.kind === 'break'
                          ? 'focus.breakRunning'
                          : 'focus.running',
                    )
                  : t('focus.choose')}
              </div>
              <h2>{label}</h2>
              <div className="focus-clock" aria-label={elapsedClock(countdown)}>
                {elapsedClock(countdown)}
              </div>
              <div className="focus-controls">
                {session ? (
                  <>
                    <button
                      className="button secondary"
                      disabled={data.pending}
                      onClick={() => void action(session.state === 'running' ? 'pause' : 'resume')}
                    >
                      {session.state === 'running' ? <Pause size={16} /> : <Play size={16} />}{' '}
                      {t(session.state === 'running' ? 'focus.pause' : 'focus.resume')}
                    </button>
                    <button
                      className="button primary"
                      disabled={data.pending}
                      onClick={() => void action('stop')}
                    >
                      <Square size={13} />
                      {t('focus.finish')}
                    </button>
                  </>
                ) : (
                  <button
                    className="button primary"
                    disabled={data.pending}
                    onClick={() => void start()}
                  >
                    <Play size={16} />
                    {t('focus.start')}
                  </button>
                )}
              </div>
            </div>
            <div className="focus-options">
              <label>
                <span>{t('focus.project')}</span>
                <select
                  value={session?.projectId ?? project}
                  disabled={!!session || data.pending}
                  onChange={(e) => {
                    setProject(e.target.value);
                    setTask('');
                  }}
                >
                  <option value="">{t('focus.general')}</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {projectPath(p.id, snapshot.projects)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t('focus.task')}</span>
                <select
                  value={session?.taskId ?? task}
                  disabled={!!session || data.pending}
                  onChange={(e) => {
                    setTask(e.target.value);
                    const item = snapshot.tasks.find(
                      (candidate) => candidate.id === e.target.value,
                    );
                    if (item?.projectId) setProject(item.projectId);
                  }}
                >
                  <option value="">{t('common.none')}</option>
                  {available.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="break-options">
                <label>
                  <span>{t('focus.breakDuration')}</span>
                  <select
                    value={breakMinutes}
                    disabled={!!session || data.pending}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  >
                    {Array.from(new Set([Number(data.preferences.breakMinutes), 5, 10, 15, 20]))
                      .sort((a, b) => a - b)
                      .map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {t('focus.minutes', { count: minutes })}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className="button secondary"
                  disabled={!!session || data.pending}
                  onClick={() =>
                    void data.mutate('startFocus', {
                      body: { kind: 'break', targetSeconds: breakMinutes * 60 },
                    })
                  }
                >
                  <Coffee size={15} />
                  {t('focus.break')}
                </button>
              </div>
            </div>
          </section>
          <section className="focus-daily">
            <div>
              <span>{t('focus.today')}</span>
              <strong>{duration(total)}</strong>
            </div>
            {goal > 0 && (
              <>
                <div className="progress-track">
                  <span style={{ width: `${Math.min(100, (total / goal) * 100)}%` }} />
                </div>
                <span>{t('focus.goal', { duration: duration(goal) })}</span>
              </>
            )}
          </section>
          <SessionHistory
            sessions={snapshot.focus.sessions}
            projects={snapshot.projects}
            busy={data.pending}
            onEdit={setEditing}
          />
        </>
      ) : (
        <Statistics data={data} today={today} />
      )}{' '}
      {editing && <SessionEditor session={editing} data={data} onClose={() => setEditing(null)} />}
    </main>
  );
}
