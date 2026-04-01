import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProgressBar({ value, max = 100, color, className, showLabel = true, size = 'md' }: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  const barColor = color || (percentage > 90 ? '#ef4444' : percentage > 75 ? '#f59e0b' : '#6366f1');
  const sizes = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-slate-400">{percentage}%</span>
        </div>
      )}
      <div className={cn('w-full rounded-full bg-slate-700/50 overflow-hidden', sizes[size])}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
