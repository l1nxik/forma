import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Language } from '../api/client';
import en from './en.json';
import ru from './ru.json';
import { parseDate } from '../state/dates';
export type TextKey = keyof typeof en;
const translations: Record<Language, Record<TextKey, string>> = { en, ru };
export function translate(
  language: Language,
  key: TextKey,
  parameters: Record<string, string | number> = {},
): string {
  return translations[language][key].replace(/\{(\w+)\}/g, (_, name: string) =>
    String(parameters[name] ?? `{${name}}`),
  );
}
export function elapsedClock(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function shortDuration(milliseconds: number, language: Language): string {
  if (milliseconds > 0 && milliseconds < 60000)
    return `${Math.floor(milliseconds / 1000)} ${language === 'ru' ? 'с' : 's'}`;
  const minutes = Math.floor(Math.max(0, milliseconds) / 60000);
  const hours = Math.floor(minutes / 60);
  if (!hours) return `${minutes} ${language === 'ru' ? 'мин' : 'min'}`;
  return `${hours} ${language === 'ru' ? 'ч' : 'h'}${minutes % 60 ? ` ${minutes % 60} ${language === 'ru' ? 'мин' : 'min'}` : ''}`;
}
function value(language: Language) {
  const locale = language === 'ru' ? 'ru-RU' : 'en-GB';
  return {
    language,
    locale,
    t: (key: TextKey, parameters?: Record<string, string | number>) =>
      translate(language, key, parameters),
    date: (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) =>
      new Intl.DateTimeFormat(locale, options).format(parseDate(date)),
    time: (date: string) =>
      new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
        new Date(date),
      ),
    duration: (milliseconds: number) => shortDuration(milliseconds, language),
  };
}
const Context = createContext(value('en'));
export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const context = useMemo(() => value(language), [language]);
  return <Context.Provider value={context}>{children}</Context.Provider>;
}
export const useI18n = () => useContext(Context);
export function errorText(error: unknown, language: Language): string {
  const code = String(error).replace(/^Error: /, '');
  const key = `error.${code}` as TextKey;
  return key in en ? translate(language, key) : translate(language, 'error.generic');
}
