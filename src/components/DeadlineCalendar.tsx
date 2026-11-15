import { useState } from 'react';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import type { Project, Task } from '../api/client';
import { useI18n } from '../i18n';
import { addDays, localDate, parseDate } from '../state/dates';
export function DeadlineCalendar({
  tasks,
  projects,
  today,
  onOpen,
}: {
  tasks: Task[];
  projects: Project[];
  today: string;
  onOpen: (task: Task) => void;
}) {
  const { t, date, locale } = useI18n();
  const [month, setMonth] = useState(today.slice(0, 7) + '-01'),
    [selected, setSelected] = useState(today);
  const start = parseDate(month),
    padding = (start.getDay() + 6) % 7,
    count = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const pending = tasks.filter((task) => !task.completed && task.deadline);
  const selectedTasks = pending.filter((task) => task.deadline === selected),
    upcoming = pending
      .filter((task) => task.deadline! >= today && task.deadline !== selected)
      .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
      .slice(0, 5);
  const shift = (amount: number) => {
    const value = parseDate(month);
    value.setMonth(value.getMonth() + amount);
    setMonth(localDate(value));
  };
  const weekday = (index: number) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(
      parseDate(addDays('2026-11-16', index)),
    );
  const row = (task: Task) => {
    const project = projects.find((item) => item.id === task.projectId);
    return (
      <button className="deadline-row" key={task.id} onClick={() => onOpen(task)}>
        <Flag size={12} />
        <span>
          <strong>{task.title}</strong>
          <small>
            {date(task.deadline!, { day: 'numeric', month: 'short' })}
            {project ? ` · ${project.name}` : ''}
          </small>
        </span>
      </button>
    );
  };
  return (
    <aside className="deadline-calendar">
      <section>
        <div className="calendar-heading">
          <h2>{t('calendar.title')}</h2>
          <button
            className="text-button"
            onClick={() => {
              setMonth(today.slice(0, 7) + '-01');
              setSelected(today);
            }}
          >
            {t('calendar.today')}
          </button>
        </div>
        <div className="calendar-month">
          <h3>{date(month, { month: 'long', year: 'numeric' })}</h3>
          <div>
            <button
              className="icon-button"
              aria-label={t('calendar.previous')}
              onClick={() => shift(-1)}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              className="icon-button"
              aria-label={t('calendar.next')}
              onClick={() => shift(1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {Array.from({ length: 7 }, (_, index) => (
            <span className="calendar-weekday" key={`week-${index}`}>
              {weekday(index)}
            </span>
          ))}
          {Array.from({ length: padding }, (_, index) => (
            <span key={`pad-${index}`} />
          ))}
          {Array.from({ length: count }, (_, index) => {
            const day = addDays(month, index),
              deadlines = pending.filter((task) => task.deadline === day);
            return (
              <button
                key={day}
                aria-label={`${date(day, { dateStyle: 'full' })}${deadlines.length ? ` · ${deadlines.length}` : ''}`}
                aria-pressed={selected === day}
                className={`${selected === day ? 'selected' : ''} ${today === day ? 'is-today' : ''} ${deadlines.length ? 'has-deadline' : ''} ${deadlines.length && day < today ? 'has-overdue' : ''}`}
                onClick={() => setSelected(day)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </section>
      <section className="calendar-deadline-list">
        <h3 className="small-label">
          {date(selected, { weekday: 'short', day: 'numeric', month: 'long' })}
        </h3>
        {selectedTasks.length ? (
          selectedTasks.map(row)
        ) : (
          <p className="calendar-empty">{t('calendar.noDay')}</p>
        )}
        {upcoming.length > 0 && (
          <>
            <h3 className="small-label upcoming-label">{t('calendar.upcoming')}</h3>
            {upcoming.map(row)}
          </>
        )}
      </section>
    </aside>
  );
}
