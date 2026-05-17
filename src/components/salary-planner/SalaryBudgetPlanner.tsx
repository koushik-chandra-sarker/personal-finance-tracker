'use client';

import { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  Lightbulb, Home, ShoppingBag, PiggyBank, Heart, Utensils,
  Bus, Smartphone, GraduationCap, Shield, Banknote, TrendingUp,
  ChevronDown, ChevronUp, Pencil, RotateCcw, Sparkles, AlertTriangle,
  CheckCircle2, Target,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { SalaryBudgetCategory, SalaryBudgetRule } from '@/types/salary-planner';
import { useI18n } from '@/i18n/client';

type ExpenseCategory = SalaryBudgetCategory & {
  icon: React.ElementType;
};

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'rent', label: 'Rent / Housing', icon: Home, percent: 25, color: '#6366f1', group: 'needs' },
  { id: 'groceries', label: 'Groceries & Food', icon: Utensils, percent: 10, color: '#8b5cf6', group: 'needs' },
  { id: 'transport', label: 'Transport', icon: Bus, percent: 5, color: '#0ea5e9', group: 'needs' },
  { id: 'utilities', label: 'Utilities & Bills', icon: Smartphone, percent: 5, color: '#14b8a6', group: 'needs' },
  { id: 'health', label: 'Healthcare', icon: Heart, percent: 5, color: '#f43f5e', group: 'needs' },
  { id: 'shopping', label: 'Shopping & Lifestyle', icon: ShoppingBag, percent: 10, color: '#f59e0b', group: 'wants' },
  { id: 'entertainment', label: 'Entertainment', icon: Sparkles, percent: 5, color: '#ec4899', group: 'wants' },
  { id: 'dining', label: 'Dining Out', icon: Utensils, percent: 5, color: '#f97316', group: 'wants' },
  { id: 'education', label: 'Education / Skills', icon: GraduationCap, percent: 5, color: '#a855f7', group: 'wants' },
  { id: 'personal', label: 'Personal Care', icon: Heart, percent: 5, color: '#d946ef', group: 'wants' },
  { id: 'emergency', label: 'Emergency Fund', icon: Shield, percent: 10, color: '#10b981', group: 'savings' },
  { id: 'investments', label: 'Investments', icon: TrendingUp, percent: 5, color: '#059669', group: 'savings' },
  { id: 'savings', label: 'General Savings', icon: PiggyBank, percent: 5, color: '#22c55e', group: 'savings' },
];

function toBudgetCategory(category: ExpenseCategory): SalaryBudgetCategory {
  return {
    id: category.id,
    label: category.label,
    percent: category.percent,
    color: category.color,
    group: category.group,
  };
}

export const DEFAULT_SALARY_BUDGET_CATEGORIES: SalaryBudgetCategory[] = DEFAULT_CATEGORIES.map(toBudgetCategory);

const RULES: Record<SalaryBudgetRule, { needs: number; wants: number; savings: number; label: string; description: string }> = {
  '50-30-20': { needs: 50, wants: 30, savings: 20, label: '50/30/20', description: 'Balanced — popular worldwide for a healthy financial life' },
  '60-20-20': { needs: 60, wants: 20, savings: 20, label: '60/20/20', description: 'Conservative — higher essentials, lower discretionary' },
  '70-20-10': { needs: 70, wants: 20, savings: 10, label: '70/20/10', description: 'Starter — when living costs are high relative to income' },
  'custom': { needs: 0, wants: 0, savings: 0, label: 'Custom', description: 'Set your own allocation percentages' },
};

const BN_BUDGET_LABELS: Record<string, string> = {
  rent: 'ভাড়া / বাসস্থান',
  groceries: 'বাজার ও খাবার',
  transport: 'যাতায়াত',
  utilities: 'ইউটিলিটি ও বিল',
  health: 'স্বাস্থ্যসেবা',
  shopping: 'শপিং ও লাইফস্টাইল',
  entertainment: 'বিনোদন',
  dining: 'বাইরে খাওয়া',
  education: 'শিক্ষা / স্কিল',
  personal: 'ব্যক্তিগত যত্ন',
  emergency: 'ইমার্জেন্সি ফান্ড',
  investments: 'বিনিয়োগ',
  savings: 'সাধারণ সঞ্চয়',
  needs: 'প্রয়োজন',
  wants: 'ইচ্ছা',
  savingsGroup: 'সঞ্চয়',
};

function fmt(n: number, currency: string, locale: string) {
  return formatCurrency(n, currency, locale);
}

function BudgetTooltip({ active, payload, netMonthly, currency, locale }: { active?: boolean; payload?: Array<{ value: number; name: string; payload: { color: string } }>; netMonthly: number; currency: string; locale: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl text-xs">
      <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
      <p className="text-slate-600 dark:text-slate-300">{p.value}% — {fmt((netMonthly * p.value) / 100, currency, locale)}/mo</p>
    </div>
  );
}

const TIPS = [
  { icon: PiggyBank, title: 'Pay Yourself First', text: 'Move savings to a separate account the day you get paid — before spending on anything else.' },
  { icon: Shield, title: 'Emergency Fund', text: 'Build 3-6 months of living expenses as an emergency fund before focusing on investments.' },
  { icon: Banknote, title: 'Track Every Taka', text: 'Small daily expenses add up. ৳100/day on snacks = ৳36,500/year — enough for a DPS!' },
  { icon: TrendingUp, title: 'Start a DPS', text: 'Even ৳1,000/month DPS grows significantly with compound interest over 5-10 years.' },
  { icon: Target, title: 'Set Clear Goals', text: 'Define what you\'re saving for — house, car, education, retirement. Goals keep you motivated.' },
  { icon: GraduationCap, title: 'Invest in Skills', text: 'Spending on learning new skills is the best investment — it increases your future earning potential.' },
];
const BN_TIPS = [
  { title: 'নিজেকে আগে পেমেন্ট দিন', text: 'বেতন পাওয়ার দিনই সঞ্চয় আলাদা অ্যাকাউন্টে সরিয়ে রাখুন, খরচের আগে।' },
  { title: 'ইমার্জেন্সি ফান্ড', text: 'বিনিয়োগে জোর দেওয়ার আগে ৩-৬ মাসের খরচের সমান ইমার্জেন্সি ফান্ড গড়ুন।' },
  { title: 'প্রতি টাকা ট্র্যাক করুন', text: 'ছোট খরচ জমে বড় হয়। প্রতিদিন ১০০ টাকা মানে বছরে ৩৬,৫০০ টাকা।' },
  { title: 'DPS শুরু করুন', text: 'প্রতি মাসে ১,০০০ টাকার DPS-ও ৫-১০ বছরে বড় অঙ্কে দাঁড়াতে পারে।' },
  { title: 'স্পষ্ট লক্ষ্য রাখুন', text: 'বাড়ি, গাড়ি, শিক্ষা বা রিটায়ারমেন্ট, সঞ্চয়ের কারণ পরিষ্কার থাকলে নিয়ম ধরে রাখা সহজ হয়।' },
  { title: 'স্কিলে বিনিয়োগ করুন', text: 'নতুন স্কিল শেখার খরচ সেরা বিনিয়োগগুলোর একটি, কারণ এটি ভবিষ্যৎ আয়ের সম্ভাবনা বাড়ায়।' },
];

type Props = { netMonthly: number; currency: string };

function withIcons(categories: SalaryBudgetCategory[]) {
  return categories.map((category) => ({
    ...category,
    icon: DEFAULT_CATEGORIES.find((item) => item.id === category.id)?.icon ?? Target,
  }));
}

function serializeCategories(categories: ExpenseCategory[]): SalaryBudgetCategory[] {
  return categories.map(toBudgetCategory);
}

type ExtendedProps = Props & {
  budgetRule?: SalaryBudgetRule;
  budgetCategories?: SalaryBudgetCategory[];
  onBudgetChange?: (state: { rule: SalaryBudgetRule; categories: SalaryBudgetCategory[] }) => void;
};

export default function SalaryBudgetPlanner({ netMonthly, currency, budgetRule = '50-30-20', budgetCategories, onBudgetChange }: ExtendedProps) {
  const { locale, messages } = useI18n();
  const copy = messages.pages.salaryPlanner;
  const [rule, setRule] = useState<SalaryBudgetRule>(budgetRule);
  const [categories, setCategories] = useState<ExpenseCategory[]>(withIcons(budgetCategories?.length ? budgetCategories : DEFAULT_SALARY_BUDGET_CATEGORIES));
  const [showDetails, setShowDetails] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setRule(budgetRule);
  }, [budgetRule]);

  useEffect(() => {
    setCategories(withIcons(budgetCategories?.length ? budgetCategories : DEFAULT_SALARY_BUDGET_CATEGORIES));
  }, [budgetCategories]);

  const pushBudgetChange = (nextRule: SalaryBudgetRule, nextCategories: ExpenseCategory[]) => {
    onBudgetChange?.({ rule: nextRule, categories: serializeCategories(nextCategories) });
  };

  const ruleConfig = RULES[rule];

  const grouped = useMemo(() => {
    const needs = categories.filter(c => c.group === 'needs');
    const wants = categories.filter(c => c.group === 'wants');
    const savings = categories.filter(c => c.group === 'savings');
    const needsTotal = needs.reduce((s, c) => s + c.percent, 0);
    const wantsTotal = wants.reduce((s, c) => s + c.percent, 0);
    const savingsTotal = savings.reduce((s, c) => s + c.percent, 0);
    return { needs, wants, savings, needsTotal, wantsTotal, savingsTotal, total: needsTotal + wantsTotal + savingsTotal };
  }, [categories]);

  const applyRule = (r: SalaryBudgetRule) => {
    setRule(r);
    if (r === 'custom') {
      pushBudgetChange(r, categories);
      return;
    }
    const config = RULES[r];
    const scaleGroup = (group: 'needs' | 'wants' | 'savings', target: number) => {
      const items = DEFAULT_CATEGORIES.filter(c => c.group === group);
      const currentTotal = items.reduce((s, c) => s + c.percent, 0);
      if (currentTotal === 0) return items;
      const factor = target / currentTotal;
      return items.map(c => ({ ...c, percent: Math.round(c.percent * factor) }));
    };
    const newCats = [
      ...scaleGroup('needs', config.needs),
      ...scaleGroup('wants', config.wants),
      ...scaleGroup('savings', config.savings),
    ];
    setCategories(newCats);
    pushBudgetChange(r, newCats);
  };

  const updatePercent = (id: string, newPercent: number) => {
    setCategories(prev => {
      const next = prev.map(c => c.id === id ? { ...c, percent: Math.max(0, Math.min(100, newPercent)) } : c);
      pushBudgetChange('custom', next);
      return next;
    });
    setRule('custom');
  };

  const groupLabel = (group: 'needs' | 'wants' | 'savings') => {
    if (locale !== 'bn-BD') return group[0].toUpperCase() + group.slice(1);
    return group === 'savings' ? BN_BUDGET_LABELS.savingsGroup : BN_BUDGET_LABELS[group];
  };
  const categoryLabel = (category: ExpenseCategory) => locale === 'bn-BD' ? (BN_BUDGET_LABELS[category.id] ?? category.label) : category.label;

  const pieData = [
    { name: groupLabel('needs'), value: grouped.needsTotal, color: '#6366f1' },
    { name: groupLabel('wants'), value: grouped.wantsTotal, color: '#f59e0b' },
    { name: groupLabel('savings'), value: grouped.savingsTotal, color: '#10b981' },
  ].filter(d => d.value > 0);

  const detailPieData = categories.filter(c => c.percent > 0).map(c => ({ name: categoryLabel(c), value: c.percent, color: c.color }));

  const healthScore = useMemo(() => {
    const savingsRatio = grouped.savingsTotal;
    if (savingsRatio >= 25) return { score: locale === 'bn-BD' ? 'চমৎকার' : 'Excellent', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2 };
    if (savingsRatio >= 20) return { score: locale === 'bn-BD' ? 'ভালো' : 'Good', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10', icon: CheckCircle2 };
    if (savingsRatio >= 10) return { score: locale === 'bn-BD' ? 'মোটামুটি' : 'Fair', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: AlertTriangle };
    return { score: locale === 'bn-BD' ? 'উন্নতি দরকার' : 'Needs Improvement', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: AlertTriangle };
  }, [grouped.savingsTotal, locale]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Health Score + Rule Selector */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className={cn('rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5', healthScore.bg)}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-xl', healthScore.bg)}>
              <healthScore.icon className={cn('h-6 w-6', healthScore.color)} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{locale === 'bn-BD' ? 'সঞ্চয়ের স্বাস্থ্য' : 'Savings Health'}</p>
              <p className={cn('text-lg font-bold', healthScore.color)}>{healthScore.score}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {locale === 'bn-BD' ? 'আপনি হাতে পাওয়া আয়ের' : 'You are saving'} <span className="font-semibold">{grouped.savingsTotal}%</span> ({fmt((netMonthly * grouped.savingsTotal) / 100, currency, locale)}/mo) {locale === 'bn-BD' ? 'সঞ্চয় করছেন।' : 'of your take-home pay.'}
            {grouped.savingsTotal < 20 && (locale === 'bn-BD' ? ' দীর্ঘমেয়াদি নিরাপত্তার জন্য অন্তত ২০% লক্ষ্য করুন।' : ' Aim for at least 20% for long-term financial security.')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
          <p className="text-xs font-semibold text-slate-900 dark:text-white mb-3">{copy.budgetPlanner}</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(RULES) as SalaryBudgetRule[]).map(r => (
              <button key={r} onClick={() => applyRule(r)}
                className={cn('px-3 py-2 rounded-xl text-xs font-semibold transition-all border',
                  rule === r
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/25'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-400')}>
                {RULES[r].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{ruleConfig.description}</p>
        </div>
      </div>

      {/* Allocation Summary */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: groupLabel('needs'), total: grouped.needsTotal, amount: (netMonthly * grouped.needsTotal) / 100, color: 'from-indigo-500 to-blue-600', textColor: 'text-indigo-600 dark:text-indigo-400' },
          { label: groupLabel('wants'), total: grouped.wantsTotal, amount: (netMonthly * grouped.wantsTotal) / 100, color: 'from-amber-500 to-orange-600', textColor: 'text-amber-600 dark:text-amber-400' },
          { label: groupLabel('savings'), total: grouped.savingsTotal, amount: (netMonthly * grouped.savingsTotal) / 100, color: 'from-emerald-500 to-green-600', textColor: 'text-emerald-600 dark:text-emerald-400' },
        ].map(g => (
          <div key={g.label} className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{g.label}</span>
              <span className={cn('text-xs font-bold', g.textColor)}>{g.total}%</span>
            </div>
            <p className={cn('text-lg font-bold', g.textColor)}>{fmt(g.amount, currency, locale)}</p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div className={cn('h-full rounded-full bg-gradient-to-r', g.color)} style={{ width: `${Math.min(g.total, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Categories */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Pie Charts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{locale === 'bn-BD' ? 'বরাদ্দ ওভারভিউ' : 'Allocation Overview'}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<BudgetTooltip netMonthly={netMonthly} currency={currency} locale={locale} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{copy.salaryBreakdown}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={detailPieData} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value">
                  {detailPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<BudgetTooltip netMonthly={netMonthly} currency={currency} locale={locale} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category List */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{locale === 'bn-BD' ? 'খরচের ক্যাটাগরি' : 'Spending Categories'}</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => applyRule('50-30-20')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors" title="Reset">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setShowDetails(!showDetails)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          {showDetails && (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[480px] overflow-y-auto">
              {(['needs', 'wants', 'savings'] as const).map(group => (
                <div key={group}>
                  <div className={cn('px-5 py-2 text-[11px] font-bold uppercase tracking-wider',
                    group === 'needs' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                    group === 'wants' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  )}>
                    {groupLabel(group)} — {categories.filter(c => c.group === group).reduce((s, c) => s + c.percent, 0)}%
                  </div>
                  {categories.filter(c => c.group === group).map(cat => (
                    <div key={cat.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: cat.color + '15' }}>
                        <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{categoryLabel(cat)}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{fmt((netMonthly * cat.percent) / 100, currency, locale)}/mo</p>
                      </div>
                      {editingId === cat.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" min={0} max={100} value={cat.percent} autoFocus
                            onChange={e => updatePercent(cat.id, Number(e.target.value))}
                            onBlur={() => setEditingId(null)}
                            onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                            className="w-14 rounded-lg border border-indigo-400 bg-white dark:bg-slate-700 px-2 py-1 text-xs text-center text-slate-900 dark:text-white focus:outline-none" />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                      ) : (
                        <button onClick={() => setEditingId(cat.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors">
                          {cat.percent}% <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {grouped.total !== 100 && (
            <div className="px-5 py-3 bg-rose-50 dark:bg-rose-500/10 border-t border-rose-200 dark:border-rose-500/20">
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                Total allocation is {grouped.total}% — {grouped.total > 100 ? 'over' : 'under'} 100%. Adjust categories to balance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Smart Tips */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" /> {locale === 'bn-BD' ? 'স্মার্ট টাকা টিপস' : 'Smart Money Tips'}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TIPS.map((tip, i) => (
            <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 p-4 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <tip.icon className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">{locale === 'bn-BD' ? BN_TIPS[i].title : tip.title}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{locale === 'bn-BD' ? BN_TIPS[i].text : tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
