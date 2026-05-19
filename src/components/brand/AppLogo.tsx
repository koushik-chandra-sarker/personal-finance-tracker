import { Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

export const APP_NAME = 'TakaPilot';
export const APP_TAGLINE = 'Personal Finance Manager';

type AppLogoProps = {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tagline?: string;
  textClassName?: string;
  taglineClassName?: string;
};

const sizeClasses = {
  sm: {
    mark: 'h-8 w-8 rounded-lg',
    text: 'text-base',
    tagline: 'text-[10px]',
    letters: 'text-[11px]',
    navigator: 'h-4 w-4 -right-1 -top-1 rounded-md',
    navigatorIcon: 'h-2.5 w-2.5',
  },
  md: {
    mark: 'h-10 w-10 rounded-xl',
    text: 'text-lg',
    tagline: 'text-[10px]',
    letters: 'text-sm',
    navigator: 'h-5 w-5 -right-1.5 -top-1.5 rounded-lg',
    navigatorIcon: 'h-3 w-3',
  },
  lg: {
    mark: 'h-12 w-12 rounded-2xl',
    text: 'text-2xl',
    tagline: 'text-xs',
    letters: 'text-base',
    navigator: 'h-6 w-6 -right-1.5 -top-1.5 rounded-lg',
    navigatorIcon: 'h-3.5 w-3.5',
  },
};

export default function AppLogo({
  showText = true,
  size = 'md',
  tagline = APP_TAGLINE,
  textClassName,
  taglineClassName,
}: AppLogoProps) {
  const classes = sizeClasses[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-visible bg-gradient-to-br from-emerald-500 via-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25',
          classes.mark
        )}
        aria-hidden="true"
      >
        <span className={cn('font-black uppercase leading-none', classes.letters)}>tk</span>
        <span className={cn('absolute flex items-center justify-center bg-white text-indigo-600 shadow-md', classes.navigator)}>
          <Navigation className={classes.navigatorIcon} strokeWidth={3} />
        </span>
      </div>
      {showText && (
        <div className="min-w-0">
          <h1 className={cn('font-bold leading-tight text-slate-900 dark:text-slate-200', classes.text, textClassName)}>
            {APP_NAME}
          </h1>
          <p className={cn('leading-tight text-slate-500 dark:text-slate-400', classes.tagline, taglineClassName)}>
            {tagline}
          </p>
        </div>
      )}
    </div>
  );
}
