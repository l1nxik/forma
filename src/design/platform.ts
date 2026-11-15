/** UI conventions only; native capabilities stay behind the desktop bridge. */
export const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
export const commandKey = isMac ? '⌘' : 'Ctrl+';
export const sidebarShortcut = isMac ? '⇧⌘S' : 'Ctrl+Shift+S';
