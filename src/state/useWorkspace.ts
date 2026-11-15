import { useCallback, useEffect, useRef, useState } from 'react';
import {
  backendStatus,
  desktop,
  request,
  zone,
  applyNativeLanguage,
  type Preferences,
  type MutationOperation,
  type RequestOptions,
  type Workspace,
  type WorkspaceSnapshot,
} from '../api/client';
import { applyTheme } from '../design/themes';
import { applyGlassTransparency } from '../design/glass';
const defaults: Preferences = {
  theme: 'system',
  language: 'en',
  dailyGoalMinutes: '120',
  breakMinutes: '5',
  sidebarCollapsed: 'false',
  glassTransparency: '0',
};
export function useWorkspace(date: string) {
  const [ready, setReady] = useState(false),
    [startupError, setStartupError] = useState<string | null>(null);
  const workspace: Workspace = 'personal';
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null),
    [preferences, setPreferences] = useState(defaults);
  const [receivedAt, setReceivedAt] = useState(Date.now()),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null);
  const lock = useRef(false),
    generation = useRef(0),
    alive = useRef(true);
  const argumentsRef = useRef({ workspace, date });
  argumentsRef.current = { workspace, date };
  const load = useCallback(async () => {
    const args = argumentsRef.current;
    const version = ++generation.current;
    const result = await request<WorkspaceSnapshot>('workspace', { ...args, zone: zone() });
    if (alive.current && version === generation.current) {
      setSnapshot(result);
      setPreferences(result.preferences);
      setReceivedAt(Date.now());
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, []);
  useEffect(() => {
    if (!desktop) {
      setStartupError('desktop');
      return;
    }
    let active = true;
    const check = async () => {
      try {
        const result = await backendStatus();
        if (active) {
          setReady(result.ready);
          setStartupError(result.error);
        }
      } catch (e) {
        if (active) setStartupError(String(e));
      }
    };
    void check();
    const interval = setInterval(() => void check(), 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true);
    setError(null);
    void load()
      .catch((e) => {
        if (active) setError(String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      generation.current++;
    };
  }, [ready, workspace, date, load]);
  useEffect(() => {
    void applyNativeLanguage(preferences.language).catch(() => {});
    applyTheme(preferences.theme);
    document.documentElement.lang = preferences.language;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => applyTheme(preferences.theme);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preferences.theme, preferences.language]);
  const refresh = useCallback(async () => {
    if (lock.current) return;
    try {
      await load();
    } catch (e) {
      if (alive.current) setError(String(e));
    }
  }, [load]);
  useEffect(() => {
    applyGlassTransparency(preferences.glassTransparency);
  }, [preferences.glassTransparency]);
  useEffect(() => {
    if (!ready) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ready, refresh]);
  useEffect(() => {
    if (!ready || !snapshot?.focus.active) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [ready, snapshot?.focus.active, refresh]);
  const mutate = async <T>(
    operation: MutationOperation,
    options: RequestOptions = {},
  ): Promise<T | undefined> => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await request<T>(operation, {
        workspace: argumentsRef.current.workspace,
        ...options,
      });
      try {
        await load();
      } catch (e) {
        setError(String(e));
      }
      return result;
    } catch (e) {
      setError(String(e));
      if (String(e) === 'conflict' || String(e).startsWith('focus.')) {
        try {
          await load();
        } catch {
          /* Keep the original actionable error. */
        }
      }
      return undefined;
    } finally {
      lock.current = false;
      if (alive.current) setPending(false);
    }
  };
  return {
    ready,
    startupError,
    workspace,
    snapshot,
    preferences,
    receivedAt,
    loading,
    pending,
    error,
    setError,
    refresh,
    mutate,
  };
}
export type AppData = ReturnType<typeof useWorkspace>;
