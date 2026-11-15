import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X, AlertCircle, RefreshCw } from 'lucide-react';
import { useFeedback } from '../state/Feedback';
import { useI18n } from '../i18n';
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>('input,textarea')?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'dialog-wide' : ''}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-heading">
          <h2 id={id}>{title}</h2>
          <button
            className="icon-button"
            aria-label={t('common.close')}
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {feedback.message && (
          <div className="dialog-error" role="alert">
            <AlertCircle size={16} />
            <span>{feedback.message}</span>
            <button
              type="button"
              className="icon-button"
              aria-label={t('common.retry')}
              onClick={feedback.onRefresh}
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={t('common.close')}
              onClick={feedback.onDismiss}
            >
              <X size={14} />
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
