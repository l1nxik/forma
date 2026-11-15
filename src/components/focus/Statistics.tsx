import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { SegmentedControl } from '../SegmentedControl';
import { request, zone, type Statistics as StatisticsData } from '../../api/client';
import type { AppData } from '../../state/useWorkspace';
import { useI18n } from '../../i18n';
import { addDays, parseDate } from '../../state/dates';
export function Statistics({ data, today }: { data: AppData; today: string }) {
  const { t, date, duration } = useI18n();
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [range, setRange] = useState({ from: addDays(today, -6), to: today }),
    [draft, setDraft] = useState(range),
    [result, setResult] = useState<StatisticsData | null>(null),
    [year, setYear] = useState<StatisticsData | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      request<StatisticsData>('statistics', {
        workspace: data.workspace,
        from: range.from,
        to: range.to,
        zone: zone(),
      }),
      request<StatisticsData>('statistics', {
        workspace: data.workspace,
        from: addDays(today, -364),
        to: today,
        zone: zone(),
      }),
    ])
      .then(([stats, annual]) => {
        if (alive) {
          setResult(stats);
          setYear(annual);
        }
      })
      .catch((error) => {
        if (alive) data.setError(String(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [data.workspace, range.from, range.to, today, data.snapshot?.focus.now]);
  const choose = (value: typeof period) => {
    setPeriod(value);
    if (value !== 'custom') {
      const next = {
        from: addDays(today, value === 'week' ? -6 : value === 'month' ? -29 : -364),
        to: today,
      };
      setRange(next);
      setDraft(next);
    }
  };
  const padding = year ? (parseDate(year.days[0].date).getDay() + 6) % 7 : 0;
  const cells = year ? [...Array.from({ length: padding }, () => null), ...year.days] : [];
  const max = Math.max(1, ...(year?.days.map((day) => day.milliseconds) ?? []));
  const apply = () => {
    if (
      draft.from > draft.to ||
      (parseDate(draft.to).getTime() - parseDate(draft.from).getTime()) / 86400000 > 365
    ) {
      data.setError('statistics.range');
      return;
    }
    setRange(draft);
  };
  return (
    <div className="statistics-page" aria-busy={loading}>
      <div className="statistics-toolbar">
        <SegmentedControl
          label={t('focus.statistics')}
          value={period}
          onChange={choose}
          options={(['week', 'month', 'year', 'custom'] as const).map((value) => ({
            value,
            label: t(`stats.${value}`),
          }))}
        />
        <span className="muted">
          {date(range.from, { day: 'numeric', month: 'short' })} —{' '}
          {date(range.to, { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
      {period === 'custom' && (
        <div className="custom-range">
          <label>
            {t('stats.from')}
            <input
              type="date"
              value={draft.from}
              onChange={(e) => setDraft((current) => ({ ...current, from: e.target.value }))}
            />
          </label>
          <label>
            {t('stats.to')}
            <input
              type="date"
              value={draft.to}
              onChange={(e) => setDraft((current) => ({ ...current, to: e.target.value }))}
            />
          </label>
          <button className="button secondary" disabled={!draft.from || !draft.to} onClick={apply}>
            {t('stats.apply')}
          </button>
        </div>
      )}
      <div className="statistics-summary">
        <div>
          <span>{t('stats.focusTime')}</span>
          <strong>{duration(result?.totalMilliseconds ?? 0)}</strong>
        </div>
        <div>
          <span>{t('stats.sessions')}</span>
          <strong>{result?.sessionCount ?? 0}</strong>
        </div>
        <div>
          <span>{t('stats.activeDays')}</span>
          <strong>{result?.days.filter((day) => day.milliseconds > 0).length ?? 0}</strong>
        </div>
      </div>
      <section className="heatmap-panel">
        <div className="section-heading">
          <h2>{t('stats.activity')}</h2>
          <span className="muted">{t('stats.heatmap')}</span>
        </div>
        <div className="heatmap-scroll">
          <div className="heatmap-months">
            {year?.days.map((day, index) =>
              parseDate(day.date).getDate() === 1 ? (
                <span
                  key={day.date}
                  style={{
                    left: `${(Math.floor((index + padding) / 7) / Math.ceil(cells.length / 7)) * 100}%`,
                  }}
                >
                  {date(day.date, { month: 'short' })}
                </span>
              ) : null,
            )}
          </div>
          <div
            className="heatmap-grid"
            style={{ gridTemplateColumns: `repeat(${Math.ceil(cells.length / 7) || 53},1fr)` }}
          >
            {cells.map((day, index) =>
              day ? (
                <button
                  key={day.date}
                  tabIndex={day.date === today ? 0 : -1}
                  onKeyDown={(event) => {
                    const step = (
                      { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 } as Record<
                        string,
                        number
                      >
                    )[event.key];
                    if (step === undefined && event.key !== 'Home' && event.key !== 'End') return;
                    event.preventDefault();
                    const buttons = Array.from(
                      event.currentTarget.parentElement!.querySelectorAll('button'),
                    );
                    const current = buttons.indexOf(event.currentTarget);
                    const next =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? buttons.length - 1
                          : Math.max(0, Math.min(buttons.length - 1, current + (step ?? 0)));
                    buttons.forEach((button, i) => {
                      button.tabIndex = i === next ? 0 : -1;
                    });
                    buttons[next].focus();
                  }}
                  className={`heatmap-cell level-${day.milliseconds === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((day.milliseconds / max) * 4)))}`}
                  title={t('stats.dayLabel', {
                    date: date(day.date),
                    duration: duration(day.milliseconds),
                  })}
                  aria-label={t('stats.dayLabel', {
                    date: date(day.date),
                    duration: duration(day.milliseconds),
                  })}
                  onClick={() => {
                    const next = { from: day.date, to: day.date };
                    setPeriod('custom');
                    setRange(next);
                    setDraft(next);
                  }}
                />
              ) : (
                <span key={`pad-${index}`} />
              ),
            )}
          </div>
        </div>
        <div className="heatmap-legend">
          <span>{t('stats.less')}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={`heatmap-cell level-${level}`} />
          ))}
          <span>{t('stats.more')}</span>
        </div>
      </section>
      <section className="distribution-panel">
        <div className="section-heading">
          <h2>{t('stats.byProject')}</h2>
        </div>
        {result?.projects.length ? (
          result.projects.map((project) => (
            <div className="distribution-row" key={project.id}>
              <div>
                <span>
                  <i className={`project-dot color-${project.color}`} />
                  {project.name || t('focus.general')}
                </span>
                <strong>{duration(project.milliseconds)}</strong>
              </div>
              <div className="distribution-track">
                <span
                  className={`color-${project.color}`}
                  style={{
                    width: `${result.totalMilliseconds ? (project.milliseconds / result.totalMilliseconds) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="stats-empty">
            <BarChart3 size={27} />
            <p>{t('stats.noData')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
