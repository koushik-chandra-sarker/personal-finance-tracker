'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Globe } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { updateLocaleAction } from '@/actions/settings.actions';
import { DEFAULT_LOCALE, LOCALE_OPTIONS, normalizeLocale, type AppLocale } from '@/i18n/config';
import Select from '@/components/ui/Select';
import { cn } from '@/lib/utils';

type LanguageSwitcherProps = {
  variant?: 'settings' | 'topbar';
  label?: string;
  description?: string;
  onChanging?: (changing: boolean) => void;
};

export default function LanguageSwitcher({
  variant = 'settings',
  label = 'Language',
  description = 'Choose the language used for app text, dates, and numbers',
  onChanging,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const sessionLocale = normalizeLocale(session?.user?.preferredLocale || DEFAULT_LOCALE);
  const [locale, setLocale] = useState<AppLocale>(sessionLocale);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocale(sessionLocale);
  }, [sessionLocale]);

  const options = useMemo(() => LOCALE_OPTIONS.map((item) => ({
    value: item.value,
    label: `${item.nativeLabel} (${item.label})`,
  })), []);

  const handleLocaleChange = (nextLocale: AppLocale) => {
    setLocale(nextLocale);
    onChanging?.(true);
    startTransition(async () => {
      try {
        const result = await updateLocaleAction(nextLocale);
        if (result.success) {
          await update({ preferredLocale: result.data?.preferredLocale || nextLocale });
          document.documentElement.lang = result.data?.preferredLocale || nextLocale;
          router.refresh();
          return;
        }
        setLocale(sessionLocale);
      } finally {
        onChanging?.(false);
      }
    });
  };

  if (variant === 'topbar') {
    return (
      <label className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-500 transition-colors hover:text-slate-900 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:text-white">
        <Globe className="h-4 w-4" />
        <span className="sr-only">Language</span>
        <select
          value={locale}
          disabled={isPending}
          onChange={(event) => handleLocaleChange(normalizeLocale(event.target.value))}
          className="max-w-14 bg-transparent text-xs font-bold uppercase outline-none disabled:opacity-60 dark:bg-transparent"
          aria-label="Language"
        >
          {LOCALE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.shortLabel}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
      <div>
        <p className="text-base font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="w-full sm:w-56">
        <Select
          id="preferredLocale"
          value={locale}
          onChange={(event) => handleLocaleChange(normalizeLocale(event.target.value))}
          options={options}
          disabled={isPending}
          className={cn(isPending && 'opacity-70')}
        />
      </div>
    </div>
  );
}
