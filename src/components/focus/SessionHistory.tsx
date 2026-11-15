import { Coffee, Pencil, Timer } from 'lucide-react';
import type { FocusSession, Project } from '../../api/client';
import { useI18n } from '../../i18n';
import { localDate } from '../../state/dates';
export function SessionHistory({
  sessions,
  projects,
  onEdit,
  busy,
}: {
  sessions: FocusSession[];
  projects: Project[];
  onEdit: (session: FocusSession) => void;
  busy: boolean;
}) {
  const { t, date, time, duration } = useI18n();
  return (
    <section className="session-history">
      <div className="section-heading">
        <h2>{t('focus.history')}</h2>
      </div>
      {sessions.length ? (
        <div className="history-list">
          {sessions.map((session) => {
            const project = projects.find((p) => p.id === session.projectId);
            return (
              <div className="history-row" key={session.id}>
                <span className={`history-symbol ${session.kind === 'break' ? 'is-break' : ''}`}>
                  {session.kind === 'break' ? <Coffee size={16} /> : <Timer size={16} />}
                </span>
                <div className="history-copy">
                  <strong>
                    {session.kind === 'break'
                      ? t('focus.breakTitle')
                      : session.label === 'Focus' && !session.taskId && !session.projectId
                        ? t('focus.general')
                        : session.label}
                  </strong>
                  <span>
                    {project && (
                      <>
                        <i className={`project-dot color-${project.color}`} />
                        {project.name} ·{' '}
                      </>
                    )}
                    {date(localDate(new Date(session.startedAt)), {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {time(session.startedAt)}
                  </span>
                </div>
                <strong className="history-duration">
                  {duration(session.elapsedMilliseconds)}
                </strong>
                <button
                  className="icon-button"
                  aria-label={t('focus.editSession')}
                  disabled={busy}
                  onClick={() => onEdit(session)}
                >
                  <Pencil size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="history-empty">{t('focus.noHistory')}</p>
      )}
    </section>
  );
}
