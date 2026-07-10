import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMonthlySummary, getCategoryBreakdown, getMonthlyTrend, getRecentTransactions, getUpcomingBillsSummary } from '@/services/report.service';
import { getBudgets, getBudgetUsageSummary } from '@/services/budget.service';
import { getTotalBalance } from '@/services/account.service';
import { getSpendingInsights } from '@/services/insight.service';
import { getPortfolioSummary, getUpcomingMaturities } from '@/services/investment.service';
import { getMonthName } from '@/lib/utils';
import { formatFinancialPeriodRange, getCurrentFinancialMonthYear } from '@/lib/financial-period';
import { getFinancialMonthStartDay } from '@/services/financial-period.service';
import { DEFAULT_LOCALE } from '@/i18n/config';
import { getMessages } from '@/i18n/messages';
import SummaryCards from '@/components/dashboard/SummaryCards';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import CategoryPieChart from '@/components/dashboard/CategoryPieChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import BudgetOverview from '@/components/dashboard/BudgetOverview';
import InsightsWidget from '@/components/dashboard/InsightsWidget';
import PortfolioWidget from '@/components/dashboard/PortfolioWidget';
import MonthYearPicker from '@/components/dashboard/MonthYearPicker';
import { getEffectiveUserId } from '@/lib/access';

interface DashboardPageProps {
  searchParams: Promise<{ month?: string | string[]; year?: string | string[] }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();

  const params = await searchParams;
  const financialMonthStartDay = await getFinancialMonthStartDay(userId);
  const current = getCurrentFinancialMonthYear(new Date(), financialMonthStartDay);
  const monthParam = Array.isArray(params.month) ? params.month[0] : params.month;
  const yearParam = Array.isArray(params.year) ? params.year[0] : params.year;
  const parsedMonth = monthParam ? parseInt(monthParam, 10) : current.month;
  const parsedYear = yearParam ? parseInt(yearParam, 10) : current.year;
  const month = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : current.month;
  const year = Number.isInteger(parsedYear) ? parsedYear : current.year;
  const userLocale = session.user.preferredLocale || DEFAULT_LOCALE;
  const messages = getMessages(userLocale);
  const periodLabel = financialMonthStartDay === 1
    ? `${getMonthName(month, userLocale)} ${year}`
    : `${getMonthName(month, userLocale)} ${year} · ${formatFinancialPeriodRange(month, year, financialMonthStartDay, userLocale)}`;

  const [summary, categoryBreakdown, trend, recentTx, budgets, totalBalance, insights, summary_portfolio, maturities, upcomingBills, budgetUsageSummary] = await Promise.all([
    getMonthlySummary(userId, month, year, financialMonthStartDay),
    getCategoryBreakdown(userId, month, year, financialMonthStartDay),
    getMonthlyTrend(userId, 6, financialMonthStartDay),
    getRecentTransactions(userId, 7),
    getBudgets(userId, month, year, financialMonthStartDay),
    getTotalBalance(userId),
    getSpendingInsights(userId, financialMonthStartDay),
    getPortfolioSummary(userId),
    getUpcomingMaturities(userId),
    getUpcomingBillsSummary(userId, 14),
    getBudgetUsageSummary(userId, month, year, financialMonthStartDay),
  ]);

  const userCurrency = (session.user as { currency?: string }).currency || 'BDT';
  return (
    <div className="space-y-6">
      {/* Header with Month/Year Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{messages.dashboard.title}</h1>
        <MonthYearPicker month={month} year={year} financialMonthStartDay={financialMonthStartDay} />
      </div>

      {/* Summary Cards */}
      <SummaryCards
        summary={summary}
        totalBalance={totalBalance}
        periodLabel={periodLabel}
        currency={userCurrency}
        locale={userLocale}
        upcomingBills={upcomingBills}
        budgetUsage={budgetUsageSummary}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <IncomeExpenseChart data={trend} currency={userCurrency} locale={userLocale} />
        </div>
        <CategoryPieChart data={categoryBreakdown} currency={userCurrency} locale={userLocale} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-2">
          <RecentTransactions transactions={recentTx} currency={userCurrency} locale={userLocale} />
          <InsightsWidget insights={insights} locale={userLocale} />
        </div>
        <div className="space-y-6">
          <PortfolioWidget 
            summary={JSON.parse(JSON.stringify(summary_portfolio))} 
            upcomingMaturities={JSON.parse(JSON.stringify(maturities))} 
            currency={userCurrency} 
            locale={userLocale}
          />
          <BudgetOverview budgets={budgets} currency={userCurrency} locale={userLocale} />
        </div>
      </div>
    </div>
  );
}
