import { InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="mb-4 rounded-2xl bg-slate-100 dark:bg-slate-700/30 p-4">
        {icon || <InboxIcon className="h-12 w-12 text-slate-400 dark:text-slate-500" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
