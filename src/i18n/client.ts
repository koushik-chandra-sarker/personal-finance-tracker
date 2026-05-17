'use client';

import { useSession } from 'next-auth/react';
import { getActiveLocale } from '@/lib/utils';
import { getMessages } from '@/i18n/messages';

export function useI18n() {
  const { data: session } = useSession();
  const locale = getActiveLocale(session?.user?.preferredLocale);
  return {
    locale,
    messages: getMessages(locale),
  };
}
