import { useEffect, useState } from 'react';
import type { FocusSession } from '../api/client';
export function elapsedAt(session: FocusSession | null, receivedAt: number, now: number): number {
  return session
    ? session.elapsedMilliseconds +
        (session.state === 'running' ? Math.max(0, now - receivedAt) : 0)
    : 0;
}
export function useElapsed(session: FocusSession | null, receivedAt: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (session?.state !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session, receivedAt]);
  return elapsedAt(session, receivedAt, now);
}
