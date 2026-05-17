'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getActiveLocale } from '@/lib/utils';
import { getMessages } from '@/i18n/messages';

export function useI18n() {
  const { data: session } = useSession();
  const [locale, setLocale] = useState(() => getActiveLocale());

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLocale(getActiveLocale(session?.user?.preferredLocale));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [session?.user?.preferredLocale]);

  return {
    locale,
    messages: getMessages(locale),
  };
}
