import { describe, it, expect } from 'vitest';
import en from './en.json';
import ru from './ru.json';
import { translate, shortDuration, elapsedClock, errorText } from './index';
import { themes } from '../design/themes';
describe('localization and presets', () => {
  it('translates every English key and retains matching parameters', () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(ru[key].match(/\{\w+\}/g)?.sort() ?? []).toEqual(
        en[key].match(/\{\w+\}/g)?.sort() ?? [],
      );
    }
  });
  it('formats counts, durations and errors in the selected language', () => {
    expect(translate('ru', 'today.progress', { done: 2, total: 5 })).toBe('Выполнено 2 из 5');
    expect(shortDuration(15000, 'en')).toBe('15 s');
    expect(shortDuration(90000, 'ru')).toBe('1 мин');
    expect(elapsedClock(3661000)).toBe('01:01:01');
    expect(errorText('conflict', 'ru')).toBe(ru['error.conflict']);
  });
  it('ships each theme as a small local palette', () => {
    expect(themes).toHaveLength(17);
    expect(new Set(themes.map((theme) => theme.id)).size).toBe(themes.length);
    for (const theme of themes)
      for (const color of Object.values(theme.colors)) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
