import { isMac } from './platform';

/** The OS renders the material; this tint keeps text legible at any setting. */
export function applyGlassTransparency(value: string | number): void {
  const number = Number(value);
  const transparency = isMac && Number.isFinite(number) ? Math.max(0, Math.min(80, number)) : 0;
  document.documentElement.style.setProperty('--glass-opacity', `${100 - transparency}%`);
}
