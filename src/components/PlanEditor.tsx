import { isProjectArchived } from '../state/projects';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Hand, Plus, Search, ListOrdered, X } from 'lucide-react';
import { request, type DayPlan, type Project, type Task, type Workspace } from '../api/client';
import { useI18n } from '../i18n';
import { Dialog } from './Dialog';
import { SegmentedControl } from './SegmentedControl';
import { sortTasks } from '../state/selectors';
export function PlanEditor({
  plan,
  tasks,
  projects,
  workspace,
  busy,
  onClose,
  onSave,
  onError,
}: {
  plan: DayPlan;
  tasks: Task[];
  projects: Project[];
  workspace: Workspace;
  busy: boolean;
  onClose: () => void;
  onSave: (ids: string[], revision: number) => Promise<boolean>;
  onError: (error: string) => void;
}) {
  const { t, date } = useI18n();
  const [stage, setStage] = useState<'choose' | 'manual' | 'auto'>(
    plan.exists ? 'manual' : 'choose',
  );
  const [selected, setSelected] = useState(plan.taskIds),
    [query, setQuery] = useState(''),
    [limit, setLimit] = useState(5),
    [generating, setGenerating] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const available = sortTasks(
    tasks.filter(
      (task) =>
        !task.completed &&
        !selected.includes(task.id) &&
        !isProjectArchived(task.projectId, projects) &&
        `${task.title} ${task.notes}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    ),
  );
  const generate = async () => {
    setGenerating(true);
    try {
      const ids = await request<string[]>('suggestPlan', { workspace, date: plan.date, limit });
      if (alive.current) {
        setSelected(ids);
        setStage('auto');
      }
    } catch (e) {
      onError(String(e));
    } finally {
      if (alive.current) setGenerating(false);
    }
  };
  const move = (index: number, offset: number) =>
    setSelected((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  return (
    <Dialog
      title={`${t('plan.title')} · ${date(plan.date)}`}
      onClose={onClose}
      wide
      busy={busy || generating}
    >
      {stage === 'choose' ? (
        <div className="plan-options">
          <button className="plan-option" onClick={() => setStage('manual')}>
            <Hand size={25} />
            <strong>{t('today.manual')}</strong>
            <span>{t('plan.manualTitle')}</span>
          </button>
          <button className="plan-option" disabled={generating} onClick={() => void generate()}>
            <ListOrdered size={25} />
            <strong>{t('today.auto')}</strong>
            <span>{t('plan.autoBody')}</span>
          </button>
        </div>
      ) : (
        <>
          <div className="plan-mode-bar">
            <SegmentedControl
              label={t('plan.title')}
              value={stage}
              disabled={busy || generating}
              options={[
                { value: 'manual', label: t('today.manual') },
                { value: 'auto', label: t('today.auto') },
              ]}
              onChange={(value) => {
                if (value === 'manual') setStage('manual');
                else void generate();
              }}
            />
            {stage === 'auto' && (
              <div className="plan-limit">
                <label htmlFor="plan-limit">{t('plan.count')}</label>
                <select
                  id="plan-limit"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  disabled={generating || busy}
                >
                  {[3, 5, 7, 10, 15, 20, 30].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
                <button
                  className="text-button"
                  disabled={busy || generating}
                  onClick={() => void generate()}
                >
                  {t('plan.refresh')}
                </button>
              </div>
            )}
          </div>
          {stage === 'auto' && <p className="muted helper-text">{t('plan.autoBody')}</p>}
          <h3 className="small-label">{t('plan.selected', { count: selected.length })}</h3>
          <div className="plan-selected">
            {selected.length ? (
              selected.map((id, index) => {
                const task = tasks.find((item) => item.id === id);
                return (
                  task && (
                    <div className="plan-item" key={id}>
                      <span className="plan-number">{index + 1}</span>
                      <span className="plan-task-title">{task.title}</span>
                      <button
                        className="icon-button"
                        aria-label={t('plan.up')}
                        disabled={busy || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={t('plan.down')}
                        disabled={busy || index === selected.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={t('plan.remove')}
                        disabled={busy}
                        onClick={() =>
                          setSelected((current) => current.filter((value) => value !== id))
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                );
              })
            ) : (
              <p className="plan-empty">{t('plan.empty')}</p>
            )}
          </div>
          <div className="plan-search">
            <Search size={15} />
            <input
              aria-label={t('common.search')}
              placeholder={t('common.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <h3 className="small-label">{t('plan.available')}</h3>
          <div className="plan-available">
            {available.map((task) => (
              <button
                key={task.id}
                disabled={busy || selected.length >= 500}
                onClick={() => setSelected((current) => [...current, task.id])}
              >
                <Plus size={15} />
                <span>{task.title}</span>
                {task.deadline && (
                  <small>{date(task.deadline, { day: 'numeric', month: 'short' })}</small>
                )}
              </button>
            ))}
            {!available.length && <p className="plan-empty">{t('plan.noAvailable')}</p>}
          </div>
          <div className="dialog-footer">
            <span className="spacer" />
            <button className="button secondary" disabled={busy || generating} onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              className="button primary"
              disabled={busy || generating}
              onClick={async () => {
                if (await onSave(selected, plan.revision)) onClose();
              }}
            >
              <Check size={15} />
              {t(busy ? 'common.saving' : 'plan.save')}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
