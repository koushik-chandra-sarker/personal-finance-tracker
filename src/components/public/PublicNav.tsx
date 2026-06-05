import Link from 'next/link';
import AppLogo from '@/components/brand/AppLogo';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/config';
import { cn } from '@/lib/utils';
import PublicLanguageToggle from './PublicLanguageToggle';

type PublicNavProps = {
  active?: 'home' | 'guide' | 'contact' | 'login' | 'register';
  dark?: boolean;
  isAuthenticated?: boolean;
  locale?: AppLocale;
  labels?: {
    guide?: string;
    contact?: string;
    login?: string;
    register?: string;
    dashboard?: string;
    tagline?: string;
  };
};

export default function PublicNav({
  active,
  dark = false,
  isAuthenticated = false,
  locale = DEFAULT_LOCALE,
  labels,
}: PublicNavProps) {
  const defaultLabels = locale === 'bn-BD'
    ? {
      guide: 'গাইড',
      contact: 'যোগাযোগ',
      login: 'লগইন',
      register: 'রেজিস্টার',
      dashboard: 'ড্যাশবোর্ড',
      tagline: 'ব্যক্তিগত অর্থ ব্যবস্থাপক',
    }
    : {
      guide: 'User Guide',
      contact: 'Contact',
      login: 'Login',
      register: 'Register',
      dashboard: 'Dashboard',
      tagline: 'Personal Finance Manager',
    };
  const navLabels = { ...defaultLabels, ...labels };

  const linkClass = (key: PublicNavProps['active']) => cn(
    'rounded-xl px-3 py-2 text-sm font-bold transition-colors',
    active === key
      ? dark
        ? 'bg-white/10 text-white'
        : 'bg-slate-100 text-slate-950 dark:bg-white/10 dark:text-white'
      : dark
        ? 'text-slate-300 hover:bg-white/10 hover:text-white'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
  );

  return (
    <header className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <Link href="/" aria-label="TakaPilot home">
        <AppLogo
          size="sm"
          tagline={navLabels.tagline}
          textClassName={dark ? 'text-white' : undefined}
          taglineClassName={cn('hidden sm:block', dark ? 'text-slate-400' : undefined)}
        />
      </Link>
      <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
        <nav className="flex min-w-0 items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <Link href="/guide" className={linkClass('guide')}>{navLabels.guide}</Link>
          <Link href="/contact" className={linkClass('contact')}>{navLabels.contact}</Link>
          {isAuthenticated ? (
            <Link href="/dashboard" className={cn(linkClass(undefined), !dark && 'text-indigo-600', dark && 'text-indigo-200')}>
              {navLabels.dashboard}
            </Link>
          ) : (
            <>
              <Link href="/login" className={linkClass('login')}>{navLabels.login}</Link>
              <Link href="/register" className={cn(linkClass('register'), active !== 'register' && !dark && 'text-indigo-600', active !== 'register' && dark && 'text-indigo-200')}>
                {navLabels.register}
              </Link>
            </>
          )}
        </nav>
        <ThemeToggle variant="public" dark={dark} />
        <PublicLanguageToggle locale={locale} dark={dark} />
      </div>
    </header>
  );
}
