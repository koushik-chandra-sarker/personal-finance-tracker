import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
