'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  variant?: 'default' | 'public';
  dark?: boolean;
  className?: string;
};

export default function ThemeToggle({ variant = 'default', dark = false, className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const activeTheme = resolvedTheme ?? theme;

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={cn(variant === 'public' ? 'h-10 w-10' : 'h-9 w-9', className)} />;

  return (
    <button
      onClick={() => setTheme(activeTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        variant === 'public'
          ? [
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
            dark
              ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
              : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950',
          ]
          : 'rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-200/50 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-slate-200',
        className
      )}
      aria-label="Toggle theme"
    >
      {activeTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
