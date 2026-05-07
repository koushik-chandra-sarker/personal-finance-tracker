'use client';

import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Calendar, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { differenceInDays, formatDistanceToNow } from 'date-fns';

type Investment = {
  id: string;
  name: string;
  maturityDate: string | null;
  investedAmount: number | string;
  typeConfig: { name: string; color: string; icon: string };
};

export default function MaturityTimeline({ investments, currency }: { investments: Investment[], currency: string }) {
  if (investments.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mb-4">
          <Calendar className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No Upcoming Maturities</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
          Investments with a maturity date will appear here when they are close to maturing.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-500" />
          Maturity Timeline
        </h3>
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
          Next 90 Days
        </span>
      </div>

      <div className="p-4 space-y-3">
        {investments.map((inv) => {
          const daysLeft = inv.maturityDate ? differenceInDays(new Date(inv.maturityDate), new Date()) : 0;
          const isUrgent = daysLeft <= 7;

          return (
            <div key={inv.id} className={cn(
              "group relative p-4 rounded-xl border transition-all duration-200",
              isUrgent 
                ? "bg-rose-50/30 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20" 
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600"
            )}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: inv.typeConfig.color }}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {inv.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{inv.typeConfig.name}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                      <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(Number(inv.investedAmount), currency)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={cn(
                    "text-xs font-bold",
                    isUrgent ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-white"
                  )}>
                    {inv.maturityDate ? formatDistanceToNow(new Date(inv.maturityDate), { addSuffix: true }) : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {inv.maturityDate ? formatDate(inv.maturityDate) : ''}
                  </div>
                </div>
              </div>

              {isUrgent && (
                <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-100/50 dark:bg-rose-500/10 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-3 w-3" />
                  Action Required: Maturity Approaching
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/50">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
          Matured investments can be marked as "Closed" or "Sold" to reconcile balances.
        </p>
      </div>
    </div>
  );
}
