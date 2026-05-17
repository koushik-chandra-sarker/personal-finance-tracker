'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
} from '@/i18n/config';

export default function LocalePreferenceSync() {
  const { data: session } = useSession();
  const preferredLocale = normalizeLocale(session?.user?.preferredLocale || DEFAULT_LOCALE);

  useEffect(() => {
    document.documentElement.lang = preferredLocale;
    document.cookie = `${LOCALE_COOKIE_NAME}=${preferredLocale}; max-age=${LOCALE_COOKIE_MAX_AGE}; path=/; samesite=lax`;
  }, [preferredLocale]);

  return null;
}

