import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { FocusSession } from '../../api/client';
import type { AppData } from '../../state/useWorkspace';
import { useI18n } from '../../i18n';
import { Dialog } from '../Dialog';
function localTimestamp(instant: string): string {
  const date = new Date(instant);
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export function SessionEditor({
  session,
  data,
  onClose,
}: {
  session: FocusSession;
  data: AppData;
  onClose: () => void;
}) {
  const { t, duration } = useI18n();
  const [start, setStart] = useState(localTimestamp(session.startedAt)),
    [end, setEnd] = useState(localTimestamp(session.endedAt!)),
    [confirm, setConfirm] = useState(false);
  const changed =
    start !== localTimestamp(session.startedAt) || end !== localTimestamp(session.endedAt!);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const a = new Date(start),
      b = new Date(end);
    if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()) || b <= a) {
      data.setError('focus.invalidTime');
      return;
    }
    if (
      await data.mutate('editSession', {
        id: session.id,
        body: { startedAt: a.toISOString(), endedAt: b.toISOString(), revision: session.revision },
      })
    )
      onClose();
  };
  return (
    <Dialog title={t('focus.editSession')} onClose={onClose} busy={data.pending}>
      <form onSubmit={(e) => void submit(e)}>
        <p className="session-editor-label">
          {session.kind === 'break'
            ? t('focus.breakTitle')
            : session.label === 'Focus' && !session.taskId && !session.projectId
              ? t('focus.general')
              : session.label}
        </p>
        <div className="form-grid">
          <label className="full-width">
            <span>{t('focus.startTime')}</span>
            <input
              type="datetime-local"
              step="1"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              disabled={data.pending}
            />
          </label>
          <label className="full-width">
            <span>{t('focus.endTime')}</span>
            <input
              type="datetime-local"
              step="1"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={data.pending}
            />
          </label>
        </div>
        <p className="helper-text">
          {t('focus.recordedTime')} · {duration(session.elapsedMilliseconds)}
        </p>
        <p className="helper-text muted">{t('focus.editHint')}</p>
        {confirm && (
          <div className="delete-confirm">
            <span>{t('focus.deleteConfirm')}</span>
            <button
              type="button"
              className="danger-text"
              disabled={data.pending}
              onClick={async () => {
                if (
                  await data.mutate('deleteSession', { id: session.id, revision: session.revision })
                )
                  onClose();
              }}
            >
              {t('common.delete')}
            </button>
            <button type="button" className="text-button" onClick={() => setConfirm(false)}>
              {t('common.cancel')}
            </button>
          </div>
        )}
        <div className="dialog-footer">
          <button
            type="button"
            className="icon-button danger-text"
            aria-label={t('common.delete')}
            disabled={data.pending}
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={17} />
          </button>
          <span className="spacer" />
          <button
            type="button"
            className="button secondary"
            disabled={data.pending}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
          <button className="button primary" disabled={data.pending || !changed}>
            {t('common.save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
