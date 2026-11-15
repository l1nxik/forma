// Build-time palette extraction. No network requests are made by the application.
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
const repository = 'https://raw.githubusercontent.com/microsoft/vscode/';
const commit = await fetch('https://api.github.com/repos/microsoft/vscode/commits/main').then(
  (r) => {
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    return r.json();
  },
);
const revision = commit.sha;
const presets = [
  ['light-modern', 'Light Modern', 'theme-defaults/themes/light_modern.json', false],
  ['dark-modern', 'Dark Modern', 'theme-defaults/themes/dark_modern.json', true],
  ['light-plus', 'Light+', 'theme-defaults/themes/light_plus.json', false],
  ['dark-plus', 'Dark+', 'theme-defaults/themes/dark_plus.json', true],
  ['quiet-light', 'Quiet Light', 'theme-quietlight/themes/quietlight-color-theme.json', false],
  [
    'solarized-light',
    'Solarized Light',
    'theme-solarized-light/themes/solarized-light-color-theme.json',
    false,
  ],
  [
    'solarized-dark',
    'Solarized Dark',
    'theme-solarized-dark/themes/solarized-dark-color-theme.json',
    true,
  ],
  ['monokai', 'Monokai', 'theme-monokai/themes/monokai-color-theme.json', true],
  [
    'monokai-dimmed',
    'Monokai Dimmed',
    'theme-monokai-dimmed/themes/dimmed-monokai-color-theme.json',
    true,
  ],
  ['abyss', 'Abyss', 'theme-abyss/themes/abyss-color-theme.json', true],
  ['kimbie-dark', 'Kimbie Dark', 'theme-kimbie-dark/themes/kimbie-dark-color-theme.json', true],
  ['red', 'Red', 'theme-red/themes/Red-color-theme.json', true],
  [
    'tomorrow-night-blue',
    'Tomorrow Night Blue',
    'theme-tomorrow-night-blue/themes/tomorrow-night-blue-color-theme.json',
    true,
  ],
  ['high-contrast-dark', 'High Contrast Dark', 'theme-defaults/themes/hc_black.json', true],
  ['high-contrast-light', 'High Contrast Light', 'theme-defaults/themes/hc_light.json', false],
];
const cache = new Map();
async function read(file) {
  if (cache.has(file)) return cache.get(file);
  const response = await fetch(`${repository}${revision}/extensions/${file}`);
  if (!response.ok) throw new Error(`${file}: ${response.status}`);
  const result = ts.parseConfigFileTextToJson(file, await response.text());
  if (result.error) throw new Error(`Invalid theme ${file}`);
  const data = result.config;
  const parent = data.include
    ? await read(path.posix.normalize(path.posix.join(path.posix.dirname(file), data.include)))
    : {};
  const merged = { ...parent, ...data, colors: { ...parent.colors, ...data.colors } };
  cache.set(file, merged);
  return merged;
}
function normalize(hex) {
  return /^#[0-9a-f]{3,4}$/i.test(hex) ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex;
}
function rgb(hex) {
  hex = normalize(hex);
  if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) throw new Error(`Unexpected color ${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function mix(a, b, ratio) {
  const x = rgb(a),
    y = rgb(b);
  return (
    '#' +
    x
      .map((v, i) =>
        Math.round(v * ratio + y[i] * (1 - ratio))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
function opaque(value, bg) {
  if (!value) return bg;
  value = normalize(value);
  return value.length === 9
    ? mix(value.slice(0, 7), bg, parseInt(value.slice(7), 16) / 255)
    : value;
}
const themes = [];
for (const [id, name, file, dark] of presets) {
  const data = await read(file);
  const c = data.colors;
  const background = c['editor.background'] ?? (dark ? '#1e1e1e' : '#ffffff');
  const text = opaque(
    c['editor.foreground'] ?? c.foreground ?? (dark ? '#cccccc' : '#333333'),
    background,
  );
  const accent = opaque(
    c['button.background'] ?? c.focusBorder ?? c['activityBarBadge.background'] ?? '#0078d4',
    background,
  );
  const luminance = rgb(accent).reduce(
    (sum, v, i) =>
      sum +
      (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4) *
        [0.2126, 0.7152, 0.0722][i],
    0,
  );
  themes.push({
    id,
    name,
    dark,
    colors: {
      canvas: background,
      sidebar: opaque(
        c['sideBar.background'] ?? c['activityBar.background'],
        mix(text, background, 0.035),
      ),
      surface: opaque(c['editorWidget.background'] ?? c['quickInput.background'], background),
      panel: mix(text, background, 0.025),
      text,
      muted: mix(text, background, 0.6),
      secondary: mix(text, background, 0.8),
      line: opaque(c['widget.border'] ?? c['sideBar.border'], mix(text, background, 0.14)),
      accent,
      accentInk: luminance > 0.42 ? '#171717' : '#ffffff',
      accentSoft: mix(accent, background, dark ? 0.2 : 0.1),
      hover: mix(text, background, 0.055),
    },
  });
}
await fs.writeFile(
  new URL('../src/design/themes.json', import.meta.url),
  JSON.stringify(
    { source: `https://github.com/microsoft/vscode/tree/${revision}`, themes },
    null,
    2,
  ) + '\n',
);
await fs.mkdir(new URL('../licenses/', import.meta.url), { recursive: true });
const license = await fetch(`${repository}${revision}/LICENSE.txt`).then((r) => r.text());
await fs.writeFile(
  new URL('../licenses/VSCode-MIT.txt', import.meta.url),
  `Palette source: microsoft/vscode @ ${revision}\n\n${license}`,
);
console.log(`Extracted ${themes.length} palettes from ${revision}`);
