import Link from 'next/link';
import AppLogo from '@/components/brand/AppLogo';
import { cn } from '@/lib/utils';

type PublicNavProps = {
  active?: 'guide' | 'login' | 'register';
  dark?: boolean;
};

export default function PublicNav({ active, dark = false }: PublicNavProps) {
  const linkClass = (key: PublicNavProps['active']) => cn(
    'rounded-xl px-3 py-2 text-sm font-bold transition-colors',
    active === key
      ? dark
        ? 'bg-white/10 text-white'
        : 'bg-slate-100 text-slate-950'
      : dark
        ? 'text-slate-300 hover:bg-white/10 hover:text-white'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
  );

  return (
    <header className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <Link href="/login" aria-label="TakaPilot login">
        <AppLogo
          size="sm"
          tagline="Personal Finance Manager"
          textClassName={dark ? 'text-white' : undefined}
          taglineClassName={cn('hidden sm:block', dark ? 'text-slate-400' : undefined)}
        />
      </Link>
      <nav className="flex w-full items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 sm:w-auto">
        <Link href="/guide" className={linkClass('guide')}>User Guide</Link>
        <Link href="/login" className={linkClass('login')}>Login</Link>
        <Link href="/register" className={cn(linkClass('register'), active !== 'register' && !dark && 'text-indigo-600', active !== 'register' && dark && 'text-indigo-200')}>
          Register
        </Link>
      </nav>
    </header>
  );
}
