import { ChevronLeft, ChevronRight, ListPlus, Plus } from 'lucide-react';
import type { WorkspaceSnapshot } from '../api/client';
import { useI18n } from '../i18n';
import { addDays } from '../state/dates';
import { planTasks, completedOn } from '../state/selectors';
import { TaskList, type TaskActions } from '../components/TaskList';
import { useElapsed } from '../state/useElapsed';
import { DeadlineCalendar } from '../components/DeadlineCalendar';
export function Today({
  snapshot,
  date,
  today,
  busy,
  receivedAt,
  onDate,
  onPlan,
  onNew,
  ...actions
}: TaskActions & {
  snapshot: WorkspaceSnapshot;
  date: string;
  today: string;
  busy: boolean;
  receivedAt: number;
  onDate: (date: string) => void;
  onPlan: () => void;
  onNew: () => void;
}) {
  const { t, date: formatDate, duration } = useI18n();
  const tasks = planTasks(snapshot.tasks, snapshot.plan.taskIds),
    done = tasks.filter((task) => task.completed).length;
  const completed = completedOn(snapshot.tasks, date);
  const activePlan = tasks.filter((task) => !task.completed);
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const elapsed = useElapsed(snapshot.focus.active, receivedAt);
  const extra =
    snapshot.focus.active?.kind === 'work'
      ? Math.max(0, elapsed - snapshot.focus.active.elapsedMilliseconds)
      : 0;
  const total = snapshot.dayStatistics.totalMilliseconds + extra;
  return (
    <main className="page today-page">
      <div className="today-layout">
        <div className="today-main">
          <header className="page-heading">
            <div>
              <div className="eyebrow">
                {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <h1>{date === today ? t('today.title') : formatDate(date)}</h1>
            </div>
            <button className="button primary" disabled={busy} onClick={onNew}>
              <Plus size={16} />
              {t('common.newTask')}
            </button>
          </header>
          <div className="day-navigation">
            <div className="date-control">
              <button
                className="icon-button"
                aria-label={t('common.previous')}
                onClick={() => onDate(addDays(date, -1))}
                disabled={busy}
              >
                <ChevronLeft size={16} />
              </button>
              <input
                aria-label={t('common.date')}
                type="date"
                value={date}
                onChange={(e) => {
                  if (e.target.value) onDate(e.target.value);
                }}
                disabled={busy}
              />
              <button
                className="icon-button"
                aria-label={t('common.next')}
                onClick={() => onDate(addDays(date, 1))}
                disabled={busy}
              >
                <ChevronRight size={16} />
              </button>
              {date !== today && (
                <button className="text-button" disabled={busy} onClick={() => onDate(today)}>
                  {t('common.today')}
                </button>
              )}
            </div>
            <div className="today-time">
              <span>{t('today.focusTime')}</span>
              <strong>{duration(total)}</strong>
            </div>
          </div>
          {snapshot.plan.exists ? (
            <>
              {tasks.length > 0 && (
                <section className="plan-progress">
                  <div>
                    <strong>{t('today.progress', { done, total: tasks.length })}</strong>
                    <div className="progress-track">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  <span className="progress-percentage">{percent}%</span>
                </section>
              )}
              <section className="task-section">
                <div className="section-heading">
                  <h2>{t('today.planTitle')}</h2>
                  <button className="button secondary compact" onClick={onPlan} disabled={busy}>
                    <ListPlus size={15} />
                    {t('today.edit')}
                  </button>
                </div>
                <TaskList
                  tasks={activePlan}
                  projects={snapshot.projects}
                  tracked={snapshot.focus.taskMilliseconds}
                  today={today}
                  busy={busy}
                  {...actions}
                  empty={
                    <p className="empty-inline">
                      {t(tasks.length && done === tasks.length ? 'today.allDone' : 'today.noTasks')}
                    </p>
                  }
                />
              </section>
            </>
          ) : (
            <section className="plan-start">
              <p>{t('today.emptyBody')}</p>
              <button className="button primary" onClick={onPlan} disabled={busy}>
                <ListPlus size={16} />
                {t(date === today ? 'today.create' : 'today.createDate')}
              </button>
            </section>
          )}
          {completed.length > 0 && (
            <TaskList
              tasks={completed}
              projects={snapshot.projects}
              tracked={snapshot.focus.taskMilliseconds}
              today={today}
              busy={busy}
              completedLabel={date === today ? t('today.completed') : t('common.completed')}
              {...actions}
            />
          )}
        </div>
        <DeadlineCalendar
          tasks={snapshot.tasks}
          projects={snapshot.projects}
          today={today}
          onOpen={actions.onOpen}
        />
      </div>
    </main>
  );
}
