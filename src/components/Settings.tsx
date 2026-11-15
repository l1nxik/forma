import { useEffect, useState, type FormEvent } from 'react';
import { Check, Monitor } from 'lucide-react';
import type { AppData } from '../state/useWorkspace';
import { themes } from '../design/themes';
import { useI18n } from '../i18n';
import { Dialog } from './Dialog';
import { Logo } from './Logo';
import { applyGlassTransparency } from '../design/glass';
import { isMac } from '../design/platform';
export function Settings({ data, onClose }: { data: AppData; onClose: () => void }) {
  const { t } = useI18n();
  const [goal, setGoal] = useState(data.preferences.dailyGoalMinutes),
    [rest, setRest] = useState(data.preferences.breakMinutes),
    [transparency, setTransparency] = useState(Number(data.preferences.glassTransparency));
  useEffect(
    () => setTransparency(Number(data.preferences.glassTransparency)),
    [data.preferences.glassTransparency],
  );
  const saveTransparency = () => {
    if (String(transparency) !== data.preferences.glassTransparency)
      void data.mutate('savePreferences', { body: { glassTransparency: String(transparency) } });
  };
  const saveFocus = async (e: FormEvent) => {
    e.preventDefault();
    await data.mutate('savePreferences', { body: { dailyGoalMinutes: goal, breakMinutes: rest } });
  };
  const selected =
    data.preferences.theme === 'light'
      ? 'forma-light'
      : data.preferences.theme === 'dark'
        ? 'forma-dark'
        : data.preferences.theme;
  return (
    <Dialog title={t('nav.settings')} onClose={onClose} wide busy={data.pending}>
      <div className="settings-content">
        <div className="settings-language">
          <label htmlFor="language">{t('settings.language')}</label>
          <select
            id="language"
            value={data.preferences.language}
            disabled={data.pending}
            onChange={(e) =>
              void data.mutate('savePreferences', { body: { language: e.target.value } })
            }
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
        </div>
        <h3 className="small-label">{t('settings.appearance')}</h3>
        {isMac && (
          <div className="transparency-setting">
            <div>
              <label htmlFor="glass-transparency">{t('settings.transparency')}</label>
              <output htmlFor="glass-transparency">{transparency}%</output>
            </div>
            <input
              id="glass-transparency"
              type="range"
              min="0"
              max="80"
              step="1"
              value={transparency}
              disabled={data.pending}
              onChange={(event) => {
                const value = Number(event.target.value);
                setTransparency(value);
                applyGlassTransparency(value);
              }}
              onPointerUp={saveTransparency}
              onKeyUp={saveTransparency}
              onBlur={saveTransparency}
            />
            <p>{t('settings.transparencyHint')}</p>
          </div>
        )}
        <div className="theme-grid">
          <button
            className={`theme-card system-theme ${selected === 'system' ? 'chosen' : ''}`}
            disabled={data.pending}
            aria-pressed={selected === 'system'}
            onClick={() => void data.mutate('savePreferences', { body: { theme: 'system' } })}
          >
            <span className="theme-preview">
              <Monitor size={21} />
            </span>
            <span>{t('settings.system')}</span>
            {selected === 'system' && <Check size={12} />}
          </button>
          {themes.map((theme) => (
            <button
              className={`theme-card ${selected === theme.id ? 'chosen' : ''}`}
              key={theme.id}
              disabled={data.pending}
              aria-pressed={selected === theme.id}
              onClick={() => void data.mutate('savePreferences', { body: { theme: theme.id } })}
            >
              <span
                className="theme-preview"
                style={{ background: theme.colors.canvas, borderColor: theme.colors.line }}
              >
                <i style={{ background: theme.colors.sidebar }} />
                <b style={{ background: theme.colors.accent }} />
                <em style={{ background: theme.colors.text }} />
              </span>
              <span>{theme.name}</span>
              {selected === theme.id && <Check size={12} />}
            </button>
          ))}
        </div>

        <h3 className="small-label settings-section-title">{t('settings.focus')}</h3>
        <form onSubmit={(e) => void saveFocus(e)}>
          <div className="form-grid">
            <label>
              <span>{t('settings.dailyGoal')}</span>
              <input
                type="number"
                required
                min="0"
                max="1440"
                step="1"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={data.pending}
              />
              <small>{t('settings.goalHint')}</small>
            </label>
            <label>
              <span>{t('settings.break')}</span>
              <input
                type="number"
                required
                min="1"
                max="60"
                step="1"
                value={rest}
                onChange={(e) => setRest(e.target.value)}
                disabled={data.pending}
              />
            </label>
          </div>
          <div className="settings-save">
            <button
              className="button secondary"
              disabled={
                data.pending ||
                (goal === data.preferences.dailyGoalMinutes &&
                  rest === data.preferences.breakMinutes)
              }
            >
              {t('common.save')}
            </button>
          </div>
        </form>
        <div className="settings-about">
          <Logo size={23} />
          <span>{t('settings.about')}</span>
        </div>
      </div>
    </Dialog>
  );
}
