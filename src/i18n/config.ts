export const LOCALES = ['bn-BD', 'en-US'] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'bn-BD';
export const FALLBACK_LOCALE: AppLocale = 'en-US';
export const LOCALE_COOKIE_NAME = 'takapilot-locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_OPTIONS: {
  value: AppLocale;
  label: string;
  nativeLabel: string;
  shortLabel: string;
}[] = [
  { value: 'bn-BD', label: 'Bangla', nativeLabel: 'বাংলা', shortLabel: 'BN' },
  { value: 'en-US', label: 'English', nativeLabel: 'English', shortLabel: 'EN' },
];

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return LOCALES.includes(value as AppLocale);
}

export function normalizeLocale(value: string | null | undefined): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}

