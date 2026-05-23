'use client';

import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useState, useTransition } from 'react';
import { updateLocaleAction } from '@/actions/settings.actions';
import { LOCALE_OPTIONS, normalizeLocale, type AppLocale } from '@/i18n/config';
import { cn } from '@/lib/utils';

type PublicLanguageToggleProps = {
  locale: AppLocale;
  dark?: boolean;
  className?: string;
};

export default function PublicLanguageToggle({ locale, dark = false, className }: PublicLanguageToggleProps) {
  const router = useRouter();
  const [activeLocale, setActiveLocale] = useState<AppLocale>(locale);
  const [isPending, startTransition] = useTransition();
  const languageLabel = activeLocale === 'bn-BD' ? 'ভাষা' : 'Language';

  const handleChange = (nextValue: string) => {
    const nextLocale = normalizeLocale(nextValue);
    setActiveLocale(nextLocale);
    startTransition(async () => {
      const result = await updateLocaleAction(nextLocale);
      if (!result.success) {
        setActiveLocale(locale);
        return;
      }
      document.documentElement.lang = result.data?.preferredLocale || nextLocale;
      router.refresh();
    });
  };

  return (
    <label className={cn(
      'flex h-10 shrink-0 items-center gap-2 rounded-xl border px-2.5 text-sm font-bold transition-colors',
      dark
        ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      isPending && 'opacity-70',
      className
    )}>
      <Globe className="h-4 w-4 shrink-0" />
      <span className="sr-only">{languageLabel}</span>
      <select
        value={activeLocale}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
        className={cn(
          'bg-transparent text-xs font-black outline-none disabled:opacity-60',
          dark ? 'text-white' : 'text-slate-700'
        )}
        aria-label={languageLabel}
      >
        {LOCALE_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>{item.nativeLabel}</option>
        ))}
      </select>
    </label>
  );
}
