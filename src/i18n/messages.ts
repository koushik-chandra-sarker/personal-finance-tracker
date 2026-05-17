import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/config';
import bnBDMessages from '@/i18n/messages/bn-BD';
import enUSMessages from '@/i18n/messages/en-US';

const dictionaries = {
  'bn-BD': bnBDMessages,
  'en-US': enUSMessages,
} as const;

export type AppMessages = (typeof dictionaries)[AppLocale];

export function getMessages(locale: AppLocale = DEFAULT_LOCALE): AppMessages {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
}
