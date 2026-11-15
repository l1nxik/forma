import type { View } from '../api/client';

export interface AppLocation {
  view: View;
  projectId: string | null;
  date: string;
}
export interface NavigationHistory {
  entries: AppLocation[];
  index: number;
}

export function visitLocation(
  history: NavigationHistory,
  location: AppLocation,
): NavigationHistory {
  const current = history.entries[history.index];
  if (
    current.view === location.view &&
    current.projectId === location.projectId &&
    current.date === location.date
  )
    return history;
  const entries = [...history.entries.slice(0, history.index + 1), location];
  return { entries, index: entries.length - 1 };
}

export function moveInHistory(history: NavigationHistory, direction: -1 | 1): NavigationHistory {
  const index = history.index + direction;
  return index < 0 || index >= history.entries.length ? history : { ...history, index };
}
