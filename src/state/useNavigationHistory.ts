import { useState } from 'react';
import {
  moveInHistory,
  visitLocation,
  type AppLocation,
  type NavigationHistory,
} from './navigation';

export function useNavigationHistory(date: string) {
  const [history, setHistory] = useState<NavigationHistory>({
    entries: [{ view: 'today', projectId: null, date }],
    index: 0,
  });
  const current = history.entries[history.index];
  return {
    current,
    canGoBack: history.index > 0,
    canGoForward: history.index < history.entries.length - 1,
    visit: (location: AppLocation) => setHistory((previous) => visitLocation(previous, location)),
    move: (direction: -1 | 1): AppLocation | undefined => {
      const next = moveInHistory(history, direction);
      if (next === history) return;
      setHistory(next);
      return next.entries[next.index];
    },
    syncDate: (nextDate: string) =>
      setHistory((previous) => {
        const entries = [...previous.entries];
        if (entries[previous.index].date === nextDate) return previous;
        entries[previous.index] = { ...entries[previous.index], date: nextDate };
        return { ...previous, entries };
      }),
  };
}
