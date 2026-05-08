'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import PageViewTracker from '@/components/analytics/PageViewTracker';
import UserActivityTracker from '@/components/analytics/UserActivityTracker';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <PageViewTracker />
        <UserActivityTracker />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
