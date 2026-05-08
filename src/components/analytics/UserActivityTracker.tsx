'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const HEARTBEAT_INTERVAL_MS = 60_000;

export default function UserActivityTracker() {
  const pathname = usePathname();
  const { status } = useSession();
  const lastSentKey = useRef<string | null>(null);

  const sendHeartbeat = useCallback((force = false) => {
    if (status !== 'authenticated' || !pathname) return;
    if (document.visibilityState !== 'visible') return;

    const minuteKey = `${pathname}:${Math.floor(Date.now() / HEARTBEAT_INTERVAL_MS)}`;
    if (!force && lastSentKey.current === minuteKey) return;
    lastSentKey.current = minuteKey;

    void fetch('/api/analytics/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch((error) => {
      console.error('Failed to track user activity:', error);
    });
  }, [pathname, status]);

  useEffect(() => {
    sendHeartbeat(true);
  }, [sendHeartbeat]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const interval = window.setInterval(() => sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
    const handleVisibilityChange = () => sendHeartbeat(true);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendHeartbeat, status]);

  return null;
}
