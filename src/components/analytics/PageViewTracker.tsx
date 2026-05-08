'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastTrackedPath.current === pathname) return;

    const referrer = lastTrackedPath.current || document.referrer || null;
    lastTrackedPath.current = pathname;

    void fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, referrer }),
      keepalive: true,
    }).catch((error) => {
      console.error('Failed to track page view:', error);
    });
  }, [pathname]);

  return null;
}
