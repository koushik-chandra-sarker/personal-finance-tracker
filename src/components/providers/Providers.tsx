'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import PageViewTracker from '@/components/analytics/PageViewTracker';
import UserActivityTracker from '@/components/analytics/UserActivityTracker';
import LocalePreferenceSync from '@/components/i18n/LocalePreferenceSync';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <LocalePreferenceSync />
        <PageViewTracker />
        <UserActivityTracker />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
