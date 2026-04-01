import { cn } from '@/lib/utils';
import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white',
            'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
            'transition-all duration-200 cursor-pointer',
            error && 'border-red-500',
            className
          )}
          {...props}
        >
          <option value="" className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
export default Select;
