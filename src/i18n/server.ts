import 'server-only';

import { cookies } from 'next/headers';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  type AppLocale,
} from '@/i18n/config';

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function setLocaleCookie(locale: AppLocale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale || DEFAULT_LOCALE, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });
}

