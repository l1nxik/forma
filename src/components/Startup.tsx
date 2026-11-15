import { AlertCircle } from 'lucide-react';
import type { AppData } from '../state/useWorkspace';
import { errorText, useI18n } from '../i18n';
import { Logo } from './Logo';

export function Startup({ data }: { data: AppData }) {
  const { t, language } = useI18n();
  const failed = data.startupError || data.error;
  return (
    <div className="startup" data-tauri-drag-region>
      <Logo size={48} />
      <span className="startup-wordmark">Forma</span>
      {failed ? (
        <>
          <AlertCircle size={20} />
          <p role="alert">
            {data.startupError === 'desktop'
              ? t('startup.desktop')
              : data.error
                ? errorText(data.error, language)
                : t('startup.failed')}
          </p>
          {data.ready && (
            <button className="button secondary" onClick={() => void data.refresh()}>
              {t('common.retry')}
            </button>
          )}
        </>
      ) : (
        <>
          <span className="startup-spinner" />
          <p>{t('startup.loading')}</p>
        </>
      )}
    </div>
  );
}
