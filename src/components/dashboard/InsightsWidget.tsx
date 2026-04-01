import { Lightbulb, AlertTriangle, CheckCircle, Info } from 'lucide-react';

type Insight = {
  type: 'warning' | 'success' | 'info';
  title: string;
  message: string;
};

interface InsightsWidgetProps {
  insights: Insight[];
}

const iconMap = {
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const colorMap = {
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export default function InsightsWidget({ insights }: InsightsWidgetProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-amber-500 dark:text-amber-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Insights</h3>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          Add more transactions to get spending insights
        </p>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const Icon = iconMap[insight.type];
            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${colorMap[insight.type]}`}>
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{insight.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{insight.message}</p>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
