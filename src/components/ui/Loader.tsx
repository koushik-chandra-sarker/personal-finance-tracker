'use client';

import { cn } from '@/lib/utils';

interface LoaderProps {
  show: boolean;
  message?: string;
  backdrop?: boolean;
}

export default function Loader({ show, message = 'Processing...', backdrop = true }: LoaderProps) {
  if (!show) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-300",
      backdrop && "bg-slate-900/40 backdrop-blur-sm"
    )}>
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        {message && (
          <p className="text-sm font-medium text-slate-900 dark:text-white animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
