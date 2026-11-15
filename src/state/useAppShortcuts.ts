import { useEffect } from 'react';
import type { View } from '../api/client';

type Shortcuts = {
  ready: boolean;
  busy: boolean;
  onToggleSidebar: () => void;
  onBack: () => void;
  onForward: () => void;
  onNew: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onView: (view: View) => void;
};
const views: readonly View[] = ['today', 'tasks', 'projects', 'focus'];

export function useAppShortcuts(actions: Shortcuts) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !actions.ready) return;
      const key = event.key.toLowerCase();
      const isSidebar = event.shiftKey && key === 's';
      const isCommand = isSidebar || ['n', 'k', ',', '1', '2', '3', '4', '[', ']'].includes(key);
      if (!isCommand) return;
      event.preventDefault();
      // A shortcut must never replace an open editor and discard its draft.
      if (document.querySelector('dialog[open]')) return;
      if (isSidebar) {
        if (!actions.busy) actions.onToggleSidebar();
      } else if (key === '[' || key === ']') {
        if (!actions.busy) (key === '[' ? actions.onBack : actions.onForward)();
      } else if (key === 'n') actions.onNew();
      else if (key === 'k') actions.onSearch();
      else if (key === ',') actions.onSettings();
      else actions.onView(views[Number(key) - 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
}
