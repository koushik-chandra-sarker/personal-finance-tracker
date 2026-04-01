import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMonthlySummary, getCategoryBreakdown, getMonthlyTrend, getRecentTransactions } from '@/services/report.service';
import { getBudgets } from '@/services/budget.service';
import { getTotalBalance } from '@/services/account.service';
import { getSpendingInsights } from '@/services/insight.service';
import { getCurrentMonthYear } from '@/lib/utils';
import SummaryCards from '@/components/dashboard/SummaryCards';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import CategoryPieChart from '@/components/dashboard/CategoryPieChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import BudgetOverview from '@/components/dashboard/BudgetOverview';
import InsightsWidget from '@/components/dashboard/InsightsWidget';
import MonthYearPicker from '@/components/dashboard/MonthYearPicker';

interface DashboardPageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const params = await searchParams;
  const current = getCurrentMonthYear();
  const month = params.month ? parseInt(params.month, 10) : current.month;
  const year = params.year ? parseInt(params.year, 10) : current.year;

  const [summary, categoryBreakdown, trend, recentTx, budgets, totalBalance, insights] = await Promise.all([
    getMonthlySummary(userId, month, year),
    getCategoryBreakdown(userId, month, year),
    getMonthlyTrend(userId, 6),
    getRecentTransactions(userId, 7),
    getBudgets(userId, month, year),
    getTotalBalance(userId),
    getSpendingInsights(userId),
  ]);

  return (
    <div className="space-y-6">
      {/* Header with Month/Year Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <MonthYearPicker month={month} year={year} />
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} totalBalance={totalBalance} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <IncomeExpenseChart data={trend} />
        </div>
        <CategoryPieChart data={categoryBreakdown} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTransactions transactions={recentTx} />
        </div>
        <div className="space-y-6">
          <BudgetOverview budgets={budgets} />
          <InsightsWidget insights={insights} />
        </div>
      </div>
    </div>
  );
}
