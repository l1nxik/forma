import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import paletteData from './themes.json';
import { formaThemes } from './formaThemes';
export const themes = [...formaThemes, ...paletteData.themes];
export function applyTheme(id: string): void {
  const requested = id === 'light' ? 'forma-light' : id === 'dark' ? 'forma-dark' : id;
  const selected =
    requested === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'forma-dark'
        : 'forma-light'
      : requested;
  const palette = themes.find((theme) => theme.id === selected) ?? themes[0];
  const root = document.documentElement;
  root.dataset.theme = palette.dark ? 'dark' : 'light';
  root.dataset.palette = palette.id;
  if (isTauri())
    void getCurrentWindow()
      .setTheme(palette.dark ? 'dark' : 'light')
      .catch(() => {});
  root.style.colorScheme = palette.dark ? 'dark' : 'light';
  for (const [key, value] of Object.entries(palette.colors))
    root.style.setProperty(`--${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`, value);
}
